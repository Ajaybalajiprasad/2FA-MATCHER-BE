import { MATCH_RULES_CONFIG } from '../config/businessRules';
import { groupRepository } from '../repositories/GroupRepository';
import { searchRepository } from '../repositories/SearchRepository';
import { travellerRepository } from '../repositories/TravellerRepository';
import type { MatchContext, RuleId, SeekerCriteria } from '../types/match.types';
import type { Traveller } from '../types/traveller.types';
import { newId } from '../utils/id';
import { evaluateMatch } from '../utils/matchRules';
import { compareRanked, rankScore } from '../utils/ranking';
import type { MatchSearchInput } from '../validators/matchValidators';
import { groupService } from './groupService';
import { travellerService } from './travellerService';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const suggestionFor = (rule: RuleId, { seeker, group, owner }: MatchContext): string => {
  const pct = MATCH_RULES_CONFIG.MAX_BUDGET_DIFF_PERCENT;
  switch (rule) {
    case 'SAME_CITY':
      return `Search ${group.city} instead of ${seeker.city}`;
    case 'DATES_OVERLAP':
      return `Adjust your dates to share at least ${MATCH_RULES_CONFIG.MIN_SHARED_NIGHTS} nights with ${group.checkIn} to ${group.checkOut}`;
    case 'BUDGET': {
      const min = Math.ceil((group.budgetInr * 100) / (100 + pct));
      const max = Math.floor((group.budgetInr * (100 + pct)) / 100);
      return `Set a budget between ${inr(min)} and ${inr(max)}`;
    }
    case 'SHARED_INTERESTS': {
      const missing = owner.interests.filter((i) => !seeker.interests.includes(i));
      return `Add interests like ${missing.join(', ')}`;
    }
    case 'GENDER':
      return 'Gender preferences do not allow this group';
    case 'GROUP_SIZE':
      return 'Group is full';
  }
};

export class MatchService {
  async search(seeker: Traveller, input: MatchSearchInput) {
    const interests = [...new Set(input.interests)];
    await travellerService.assertKnownInterests(interests);
    await groupService.assertTripInData(input.city, input.checkIn, input.checkOut);

    const criteria: SeekerCriteria = {
      city: input.city,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      budgetInr: input.budgetInr,
      interests,
      gender: seeker.gender,
      genderPreference: input.genderPreference ?? seeker.genderPreference,
    };
    const searchId = newId('S');
    await searchRepository.create({ id: searchId, seekerId: seeker.id, homeCity: input.homeCity ?? null, ...criteria });

    const [openGroups, myGroups, myRequests] = await Promise.all([
      groupRepository.findOpen(),
      groupRepository.findByMember(seeker.id),
      groupRepository.requestStatusesForSeeker(seeker.id),
    ]);
    const myGroupIds = new Set(myGroups.map((g) => g.id));
    const candidates = openGroups.filter((g) => !myGroupIds.has(g.id));
    const [owners, counts] = await Promise.all([
      travellerRepository.findByIds([...new Set(candidates.map((g) => g.ownerId))]),
      groupRepository.memberCounts(candidates.map((g) => g.id)),
    ]);
    const ownerById = new Map(owners.map((o) => [o.id, o]));

    const evaluated = candidates.flatMap((g) => {
      const owner = ownerById.get(g.ownerId);
      if (!owner) return [];
      const memberCount = counts.get(g.id) ?? 0;
      const ctx: MatchContext = { seeker: criteria, group: { ...g, memberCount }, owner };
      const evaluation = evaluateMatch(ctx);
      const item = {
        groupId: g.id,
        name: g.name,
        city: g.city,
        checkIn: g.checkIn,
        checkOut: g.checkOut,
        memberCount,
        maxSize: g.maxSize,
        seatsLeft: Math.max(0, g.maxSize - memberCount),
        budgetInr: g.budgetInr,
        ownerId: owner.id,
        ownerName: owner.name,
        ...rankScore(ctx),
        rules: evaluation.rules,
        myRequestStatus: myRequests.get(g.id) ?? null,
      };
      return [{ item, ctx, failedRules: evaluation.failedRules }];
    });

    const matches = evaluated.filter((e) => e.failedRules.length === 0).map((e) => e.item);
    const nearMisses = evaluated
      .filter((e) => e.failedRules.length === 1 && e.failedRules[0] !== 'SAME_CITY')
      .map(({ item, ctx, failedRules }) => ({
        ...item,
        failedRules,
        suggestions: failedRules.map((rule) => ({ rule, suggestion: suggestionFor(rule, ctx) })),
      }));

    return {
      searchId,
      criteria: { ...criteria, homeCity: input.homeCity ?? null },
      matches: matches.sort(compareRanked),
      nearMisses: nearMisses.sort(compareRanked),
    };
  }
}

export const matchService = new MatchService();
