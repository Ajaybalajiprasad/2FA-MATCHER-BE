import { MATCH_RULES_CONFIG } from '../config/businessRules';
import { SEARCH_LIMITS } from '../config/searchLimits';
import { groupRepository } from '../repositories/GroupRepository';
import { searchRepository } from '../repositories/SearchRepository';
import { travellerRepository } from '../repositories/TravellerRepository';
import type { MatchContext, RuleId, SeekerCriteria } from '../types/match.types';
import type { Traveller } from '../types/traveller.types';
import { newId } from '../utils/id';
import { genderComposition, passesFilters } from '../utils/matchFilters';
import { evaluateMatch, seatsLeft, sharedInterests } from '../utils/matchRules';
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
    await travellerService.assertKnownInterests([...new Set([...interests, ...(input.filters?.sharedInterests ?? [])])]);
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
    const candidateIds = candidates.map((g) => g.id);
    const [owners, counts, genderCounts] = await Promise.all([
      travellerRepository.findByIds([...new Set(candidates.map((g) => g.ownerId))]),
      groupRepository.memberCounts(candidateIds),
      groupRepository.memberGenderCounts(candidateIds),
    ]);
    const ownerById = new Map(owners.map((o) => [o.id, o]));

    const evaluated = candidates.flatMap((g) => {
      const owner = ownerById.get(g.ownerId);
      if (!owner) return [];
      const memberCount = counts.get(g.id) ?? 0;
      const genders = genderCounts.get(g.id) ?? { female: 0, male: 0 };
      const ctx: MatchContext = { seeker: criteria, group: { ...g, memberCount, memberGenders: genders }, owner };
      const evaluation = evaluateMatch(ctx);
      const composition = genderComposition(genders.female, genders.male);
      const item = {
        groupId: g.id,
        name: g.name,
        city: g.city,
        checkIn: g.checkIn,
        checkOut: g.checkOut,
        memberCount,
        maxSize: g.maxSize,
        seatsLeft: seatsLeft(memberCount, g.maxSize),
        genderComposition: composition,
        budgetInr: g.budgetInr,
        itinerary: g.itinerary,
        interests: owner.interests,
        ownerId: owner.id,
        ownerName: owner.name,
        ...rankScore(ctx),
        rules: evaluation.rules,
        myRequestStatus: myRequests.get(g.id) ?? null,
      };
      const shown = passesFilters(sharedInterests(criteria.interests, owner.interests), composition, input.filters);
      return [{ item, ctx, failedRules: evaluation.failedRules, shown }];
    });

    const allMatches = evaluated.filter((e) => e.failedRules.length === 0);
    const allNearMisses = evaluated.filter((e) => e.failedRules.length === 1 && e.failedRules[0] !== 'SAME_CITY');
    const matches = allMatches.filter((e) => e.shown).map((e) => e.item);
    const nearMisses = allNearMisses
      .filter((e) => e.shown)
      .map(({ item, ctx, failedRules }) => ({
        ...item,
        failedRules,
        suggestions: failedRules.map((rule) => ({ rule, suggestion: suggestionFor(rule, ctx) })),
      }));

    return {
      searchId,
      criteria: { ...criteria, homeCity: input.homeCity ?? null },
      filters: input.filters ?? null,
      totalBeforeFilters: { matches: allMatches.length, nearMisses: allNearMisses.length },
      totalMatches: matches.length,
      totalNearMisses: nearMisses.length,
      limits: SEARCH_LIMITS,
      matches: matches.sort(compareRanked).slice(0, SEARCH_LIMITS.matches),
      nearMisses: nearMisses.sort(compareRanked).slice(0, SEARCH_LIMITS.nearMisses),
    };
  }
}

export const matchService = new MatchService();
