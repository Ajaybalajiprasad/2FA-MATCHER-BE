import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { type Group, GroupRepository, groupRepository } from '../repositories/GroupRepository';
import { JoinRequestRepository, joinRequestRepository } from '../repositories/JoinRequestRepository';
import { type Search, searchRepository } from '../repositories/SearchRepository';
import { travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import type { MatchContext, SeekerCriteria } from '../types/match.types';
import type { Traveller } from '../types/traveller.types';
import { newId } from '../utils/id';
import type { GenderPreference } from '../config/businessRules';
import { evaluateMatch, genderAllows, hasSeatFor, seatsLeft } from '../utils/matchRules';
import type { DecideRequestInput, ListRequestsQuery } from '../validators/requestValidators';

const criteriaOf = (search: Search): SeekerCriteria => ({
  city: search.city,
  checkIn: search.checkIn,
  checkOut: search.checkOut,
  budgetInr: search.budgetInr,
  interests: search.interests,
  gender: search.gender as SeekerCriteria['gender'],
  genderPreference: search.genderPreference as SeekerCriteria['genderPreference'],
});

type MemberGenders = MatchContext['group']['memberGenders'];

const contextOf = (search: Search, group: Group, memberCount: number, owner: Traveller, memberGenders: MemberGenders): MatchContext => ({
  seeker: criteriaOf(search),
  group: { ...group, memberCount, memberGenders },
  owner,
});

export class RequestService {
  private async loadGroup(groupId: string) {
    const group = await groupRepository.findById(groupId);
    if (!group) throw new AppError('Group not found', 404, ErrorCode.NOT_FOUND);
    const [owner, memberIds, genderCounts] = await Promise.all([
      travellerRepository.findById(group.ownerId),
      groupRepository.findMemberIds(groupId),
      groupRepository.memberGenderCounts([groupId]),
    ]);
    if (!owner) throw new AppError('Group owner not found', 404, ErrorCode.NOT_FOUND);
    const memberGenders = genderCounts.get(groupId) ?? { female: 0, male: 0 };
    return { group, owner, memberIds, memberGenders };
  }

  async create(seeker: Traveller, groupId: string, searchId: string) {
    const search = await searchRepository.findById(searchId);
    if (!search) throw new AppError('Search not found', 404, ErrorCode.NOT_FOUND);
    if (search.seekerId !== seeker.id) throw new AppError('This search belongs to another traveller', 403, ErrorCode.FORBIDDEN);
    const { group, owner, memberIds, memberGenders } = await this.loadGroup(groupId);
    if (memberIds.includes(seeker.id)) throw new AppError('You are already a member of this group', 409, ErrorCode.CONFLICT);
    if (group.status !== 'OPEN') throw new AppError('Group is not open for requests', 409, ErrorCode.CONFLICT);
    const existing = await joinRequestRepository.findByGroupAndSeeker(groupId, seeker.id);
    if (existing) {
      throw new AppError(`You already have a ${existing.status} request for this group`, 409, ErrorCode.CONFLICT, {
        requestId: existing.id,
        status: existing.status,
      });
    }
    const evaluation = evaluateMatch(contextOf(search, group, memberIds.length, owner, memberGenders));
    if (!evaluation.matched) {
      throw new AppError(
        `Group does not match your search: ${evaluation.failedRules.join(', ')}`,
        422,
        ErrorCode.RULE_NOT_MET,
        evaluation.rules
      );
    }
    const request = await joinRequestRepository.create({ id: newId('R'), groupId, seekerId: seeker.id, searchId, status: 'PENDING' });
    if (!request) throw new AppError('You already requested to join this group', 409, ErrorCode.CONFLICT);
    return request;
  }

  async listForGroup(callerId: string, groupId: string, { status }: ListRequestsQuery) {
    const { group, owner, memberIds, memberGenders } = await this.loadGroup(groupId);
    if (group.ownerId !== callerId) throw new AppError('Only the group owner can see requests', 403, ErrorCode.FORBIDDEN);
    const requests = await joinRequestRepository.findByGroup(groupId, status === 'ALL' ? undefined : status);
    const [seekers, searches] = await Promise.all([
      travellerRepository.findByIds([...new Set(requests.map((r) => r.seekerId))]),
      searchRepository.findByIds(requests.flatMap((r) => (r.searchId ? [r.searchId] : []))),
    ]);
    const seekerById = new Map(seekers.map((s) => [s.id, s]));
    const searchById = new Map(searches.map((s) => [s.id, s]));
    return requests.map((r) => {
      const seeker = seekerById.get(r.seekerId);
      const search = r.searchId ? searchById.get(r.searchId) : undefined;
      return {
        ...r,
        seeker: seeker
          ? { id: seeker.id, name: seeker.name, age: seeker.age, gender: seeker.gender, homeCity: seeker.homeCity, interests: seeker.interests }
          : null,
        criteria: search
          ? { checkIn: search.checkIn, checkOut: search.checkOut, budgetInr: search.budgetInr, interests: search.interests }
          : null,
        rules: search ? evaluateMatch(contextOf(search, group, memberIds.length, owner, memberGenders)).rules : null,
      };
    });
  }

  async decide(callerId: string, requestId: string, { action }: DecideRequestInput) {
    const request = await joinRequestRepository.findById(requestId);
    if (!request) throw new AppError('Request not found', 404, ErrorCode.NOT_FOUND);
    const group = await groupRepository.findById(request.groupId);
    if (!group) throw new AppError('Group not found', 404, ErrorCode.NOT_FOUND);
    if (group.ownerId !== callerId) throw new AppError('Only the group owner can decide requests', 403, ErrorCode.FORBIDDEN);
    const alreadyDecided = () => new AppError(`Request is already ${request.status}`, 409, ErrorCode.CONFLICT);
    if (request.status !== 'PENDING') throw alreadyDecided();

    // Outside the transaction: these reads use the shared connection, not the transaction's.
    if (action === 'APPROVE') await this.assertGenderStillAllowed(request.seekerId, request.searchId, group);

    const updated = await db.transaction(async (tx) => {
      const requests = new JoinRequestRepository(tx);
      if (action === 'REJECT') return requests.decide(requestId, 'REJECTED');
      const groups = new GroupRepository(tx);
      const locked = await groups.findByIdForUpdate(group.id);
      if (locked?.status !== 'OPEN') throw new AppError('Group is not open', 409, ErrorCode.CONFLICT);
      const memberCount = (await groups.memberCounts([group.id])).get(group.id) ?? 0;
      if (!hasSeatFor(memberCount, locked.maxSize)) throw new AppError('Group is full', 409, ErrorCode.CONFLICT);
      const approved = await requests.decide(requestId, 'APPROVED');
      if (approved) await groups.addMember(group.id, request.seekerId);
      return approved;
    });
    if (!updated) throw alreadyDecided();

    const memberCount = (await groupRepository.memberCounts([group.id])).get(group.id) ?? 0;
    return { ...updated, memberCount, seatsLeft: seatsLeft(memberCount, group.maxSize) };
  }

  // Membership can change between request and approval, so the gender rule is checked again here.
  private async assertGenderStillAllowed(seekerId: string, searchId: string | null, group: Group) {
    const [seeker, owner, search, genderCounts] = await Promise.all([
      travellerRepository.findById(seekerId),
      travellerRepository.findById(group.ownerId),
      searchId ? searchRepository.findById(searchId) : undefined,
      groupRepository.memberGenderCounts([group.id]),
    ]);
    if (!seeker || !owner) throw new AppError('Traveller not found', 404, ErrorCode.NOT_FOUND);
    const memberGenders = genderCounts.get(group.id) ?? { female: 0, male: 0 };
    const preference = (search?.genderPreference ?? seeker.genderPreference) as GenderPreference;
    const otherGender = seeker.gender === 'FEMALE' ? memberGenders.male : memberGenders.female;
    const groupOk = genderAllows(group.genderPreference as GenderPreference, owner.gender, seeker.gender);
    const seekerOk = preference === 'ANY' || otherGender === 0;
    if (!groupOk || !seekerOk) throw new AppError('Gender preference no longer allows this request', 422, ErrorCode.RULE_NOT_MET);
  }

  async listMine(seekerId: string) {
    const rows = await joinRequestRepository.findBySeekerWithGroup(seekerId);
    return rows.map(({ request, group }) => ({ ...request, group }));
  }
}

export const requestService = new RequestService();
