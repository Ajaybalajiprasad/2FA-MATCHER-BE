import { db, type DbOrTx } from '../db';
import { AppError } from '../middleware/errorHandler';
import { type Group, GroupRepository } from '../repositories/GroupRepository';
import { HotelRepository } from '../repositories/HotelRepository';
import { PlanningRepository, planningRepository } from '../repositories/PlanningRepository';
import { travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import { perMember, quoteRoom } from '../utils/costCalculator';
import { nightDates } from '../utils/dateUtils';
import { newId } from '../utils/id';
import type { GroupHotelsQuery } from '../validators/planningValidators';
import { groupService } from './groupService';
import { hotelService } from './hotelService';

const assertOpen = (status: string) => {
  if (status !== 'OPEN') throw new AppError('Group already booked', 409, ErrorCode.CONFLICT);
};

export class PlanningService {
  async searchHotels(groupId: string, travellerId: string, { preview, ...query }: GroupHotelsQuery) {
    const { group, memberIds } = await groupService.getForMember(groupId, travellerId);
    const membersUsed = preview === 'full' ? group.maxSize : memberIds.length;
    const result = await hotelService.getOptions({
      city: group.city,
      checkIn: group.checkIn,
      checkOut: group.checkOut,
      members: membersUsed,
      ...query,
    });
    return { groupId: group.id, city: group.city, checkIn: group.checkIn, checkOut: group.checkOut, membersUsed, ...result };
  }

  async save(groupId: string, travellerId: string, roomId: string) {
    const { group, memberIds } = await groupService.getForMember(groupId, travellerId);
    assertOpen(group.status);
    const { room, hotel, quote, nights } = await this.quoteAvailable(db, group, roomId, memberIds.length);
    const inserted = await planningRepository.insertSaved({
      id: newId('SO'),
      groupId,
      travellerId,
      hotelId: hotel.id,
      roomId,
      rooms: quote.rooms,
      nights,
      totalInr: quote.totalInr,
      perMemberInr: Math.round(quote.perMemberInr),
    });
    if (!inserted) throw new AppError('You already saved this option', 409, ErrorCode.CONFLICT);
    return {
      groupId,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomId,
      roomName: room.name,
      nights,
      members: memberIds.length,
      rooms: quote.rooms,
      totalInr: quote.totalInr,
      perMemberInr: quote.perMemberInr,
    };
  }

  async unsave(groupId: string, travellerId: string, roomId: string) {
    const { group } = await groupService.getForMember(groupId, travellerId);
    assertOpen(group.status);
    if (!(await planningRepository.deleteSaved(groupId, travellerId, roomId))) {
      throw new AppError('Saved option not found', 404, ErrorCode.NOT_FOUND);
    }
  }

  async listSaved(groupId: string, travellerId: string) {
    const { group, memberIds } = await groupService.getForMember(groupId, travellerId);
    const saved = await planningRepository.findSavedByGroup(groupId);
    const roomIds = [...new Set(saved.map((s) => s.roomId))];
    const [quotes, savers] = await Promise.all([
      this.quoteRooms(db, group, roomIds, memberIds.length),
      travellerRepository.findByIds([...new Set(saved.map((s) => s.travellerId))]),
    ]);
    const nameById = new Map(savers.map((t) => [t.id, t.name]));
    const memberCount = memberIds.length;
    return roomIds
      .map((roomId) => {
        const { room, hotel, quote, nights } = quotes.get(roomId)!;
        const savedBy = saved
          .filter((s) => s.roomId === roomId)
          .map((s) => ({ id: s.travellerId, name: nameById.get(s.travellerId) ?? null }));
        return {
          roomId,
          roomName: room.name,
          hotelId: hotel.id,
          hotelName: hotel.name,
          image: hotel.image,
          rating: hotel.rating,
          area: hotel.area,
          lat: hotel.lat,
          lng: hotel.lng,
          nights,
          rooms: quote.rooms,
          totalInr: quote.totalInr,
          perMemberInr: quote.perMemberInr,
          available: quote.available,
          savedBy,
          savedCount: savedBy.length,
          memberCount,
          alignment: `${savedBy.length}/${memberCount} members`,
        };
      })
      .sort((a, b) => b.savedCount - a.savedCount || a.totalInr - b.totalInr || a.roomId.localeCompare(b.roomId));
  }

  async book(groupId: string, travellerId: string, roomId: string) {
    const { group } = await groupService.getForMember(groupId, travellerId);
    await db.transaction(async (tx) => {
      const repo = new PlanningRepository(tx);
      const groups = new GroupRepository(tx);
      assertOpen((await groups.findByIdForUpdate(groupId))?.status ?? 'OPEN');
      const members = (await groups.findMemberIds(groupId)).length;
      const { hotel, quote, nights } = await this.quoteAvailable(tx, group, roomId, members);
      const inserted = await repo.insertBooking({
        id: newId('BK'),
        groupId,
        hotelId: hotel.id,
        roomId,
        rooms: quote.rooms,
        nights,
        members,
        totalInr: quote.totalInr,
        perMemberInr: Math.round(quote.perMemberInr),
        bookedById: travellerId,
      });
      if (!inserted) throw new AppError('Group already booked', 409, ErrorCode.CONFLICT);
      await repo.setGroupStatus(groupId, 'BOOKED');
    });
    return this.getBooking(groupId, travellerId);
  }

  async getBooking(groupId: string, travellerId: string) {
    await groupService.getForMember(groupId, travellerId);
    const booking = await planningRepository.findBookingByGroup(groupId);
    if (!booking) throw new AppError('Booking not found', 404, ErrorCode.NOT_FOUND);
    const [[found], bookedBy] = await Promise.all([
      planningRepository.findRoomsWithHotel([booking.roomId]),
      travellerRepository.findById(booking.bookedById),
    ]);
    return {
      id: booking.id,
      groupId,
      status: 'BOOKED',
      hotelId: found.hotel.id,
      hotelName: found.hotel.name,
      roomId: booking.roomId,
      roomName: found.room.name,
      rooms: booking.rooms,
      nights: booking.nights,
      members: booking.members,
      totalInr: booking.totalInr,
      perMemberInr: perMember(booking.totalInr, booking.members),
      bookedBy: bookedBy ? { id: bookedBy.id, name: bookedBy.name } : null,
      createdAt: booking.createdAt,
    };
  }

  private async quoteRooms(conn: DbOrTx, group: Group, roomIds: string[], members: number) {
    const dates = nightDates(group.checkIn, group.checkOut);
    const [found, availability] = await Promise.all([
      new PlanningRepository(conn).findRoomsWithHotel(roomIds),
      new HotelRepository(conn).findAvailability(roomIds, dates),
    ]);
    const roomsLeft = new Map(availability.map((a) => [`${a.roomId}|${a.date}`, a.roomsLeft]));
    return new Map(
      found.map(({ room, hotel }) => [
        room.id,
        {
          room,
          hotel,
          nights: dates.length,
          quote: quoteRoom({
            pricePerNightInr: room.pricePerNightInr,
            maxAdults: room.maxAdults,
            roomsLeftByNight: dates.map((d) => roomsLeft.get(`${room.id}|${d}`)),
            nights: dates.length,
            members,
          }),
        },
      ])
    );
  }

  private async quoteAvailable(conn: DbOrTx, group: Group, roomId: string, members: number) {
    const found = (await this.quoteRooms(conn, group, [roomId], members)).get(roomId);
    if (!found || found.hotel.city !== group.city) {
      throw new AppError(`Room "${roomId}" is not a room in ${group.city}`, 400, ErrorCode.VALIDATION_FAILED);
    }
    if (!found.quote.available) {
      throw new AppError('Not enough free rooms for every night of the stay', 409, ErrorCode.CONFLICT);
    }
    return found;
  }
}

export const planningService = new PlanningService();
