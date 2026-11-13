import { DATE_WINDOW } from '../config/businessRules';
import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { catalogRepository } from '../repositories/CatalogRepository';
import { type Group, GroupRepository, groupRepository } from '../repositories/GroupRepository';
import { planningRepository } from '../repositories/PlanningRepository';
import { travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import type { Traveller } from '../types/traveller.types';
import { perMember } from '../utils/costCalculator';
import { isStayInDataWindow, isValidIsoDate } from '../utils/dateUtils';
import { newId } from '../utils/id';
import { seatsLeft } from '../utils/matchRules';
import type { CreateGroupInput } from '../validators/groupValidators';

export class GroupService {
  async assertTripInData(city: string, checkIn: string, checkOut: string): Promise<void> {
    if (!(await catalogRepository.findCity(city))) {
      const valid = (await catalogRepository.findAllCities()).map((c) => c.name);
      throw new AppError(
        `City "${city}" is not available. Valid cities: ${valid.join(', ')}`,
        400,
        ErrorCode.OUT_OF_DATA_RANGE
      );
    }
    if (!isValidIsoDate(checkIn) || !isValidIsoDate(checkOut) || !isStayInDataWindow(checkIn, checkOut)) {
      throw new AppError(
        `Only ${DATE_WINDOW.FIRST_CHECK_IN} to ${DATE_WINDOW.LAST_CHECK_OUT} is available, with check-out after check-in`,
        400,
        ErrorCode.OUT_OF_DATA_RANGE
      );
    }
  }

  async create(owner: Traveller, input: CreateGroupInput) {
    await this.assertTripInData(input.city, input.checkIn, input.checkOut);
    const id = newId('G');
    await db.transaction(async (tx) => {
      const repo = new GroupRepository(tx);
      await repo.create({ id, ownerId: owner.id, status: 'OPEN', ...input });
      await repo.addMember(id, owner.id);
    });
    return this.getById(id, owner.id);
  }

  async getById(id: string, callerId?: string) {
    const group = await groupRepository.findById(id);
    if (!group) throw new AppError('Group not found', 404, ErrorCode.NOT_FOUND);
    const memberIds = await groupRepository.findMemberIds(id);
    const byId = new Map((await travellerRepository.findByIds(memberIds)).map((t) => [t.id, t]));
    const members = memberIds.flatMap((memberId) => byId.get(memberId) ?? []);
    const owner = members.find((m) => m.id === group.ownerId) ?? (await travellerRepository.findById(group.ownerId));
    const [requestStatuses, city, booking] = await Promise.all([
      callerId ? groupRepository.requestStatusesForSeeker(callerId, [id]) : undefined,
      catalogRepository.findCity(group.city),
      this.bookingSummary(group),
    ]);
    return {
      ...this.summary(group, members.length),
      timezone: city?.timezone ?? null,
      owner: owner ? { id: owner.id, name: owner.name, gender: owner.gender } : null,
      members,
      myRequestStatus: requestStatuses?.get(id) ?? null,
      booking,
    };
  }

  async getForMember(groupId: string, travellerId: string) {
    const group = await groupRepository.findById(groupId);
    if (!group) throw new AppError('Group not found', 404, ErrorCode.NOT_FOUND);
    const memberIds = await groupRepository.findMemberIds(groupId);
    if (!memberIds.includes(travellerId)) {
      throw new AppError('Only group members can do this', 403, ErrorCode.FORBIDDEN);
    }
    return { group, memberIds };
  }

  async listMine(travellerId: string) {
    const groups = await groupRepository.findByMember(travellerId);
    const ids = groups.map((g) => g.id);
    const [counts, pending] = await Promise.all([
      groupRepository.memberCounts(ids),
      groupRepository.pendingRequestCounts(ids),
    ]);
    return groups.map((g) => {
      const isOwner = g.ownerId === travellerId;
      return {
        ...this.summary(g, counts.get(g.id) ?? 0),
        role: isOwner ? 'OWNER' : 'MEMBER',
        pendingRequestCount: isOwner ? (pending.get(g.id) ?? 0) : null,
      };
    });
  }

  private summary(group: Group, memberCount: number) {
    return { ...group, memberCount, seatsLeft: seatsLeft(memberCount, group.maxSize) };
  }

  private async bookingSummary(group: Group) {
    if (group.status !== 'BOOKED') return null;
    const booking = await planningRepository.findBookingByGroup(group.id);
    if (!booking) return null;
    const [found] = await planningRepository.findRoomsWithHotel([booking.roomId]);
    return {
      id: booking.id,
      hotelName: found?.hotel.name ?? null,
      roomName: found?.room.name ?? null,
      totalInr: booking.totalInr,
      members: booking.members,
      perMemberInr: perMember(booking.totalInr, booking.members),
    };
  }
}

export const groupService = new GroupService();
