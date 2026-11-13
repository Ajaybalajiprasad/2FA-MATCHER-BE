import { MATCH_RULES_CONFIG, RANK_WEIGHTS } from '../config/businessRules';
import type { MatchContext } from '../types/match.types';
import { nights, sharedNights } from './dateUtils';
import { sharedInterests } from './matchRules';

export interface RankScore {
  score: number;
  sharedNights: number;
  sharedInterests: string[];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const rankScore = ({ seeker, group, owner }: MatchContext): RankScore => {
  const shared = sharedInterests(seeker.interests, owner.interests);
  const nightsShared = sharedNights(seeker, group).count;
  const seekerInterestCount = new Set(seeker.interests).size;
  const seekerNights = nights(seeker.checkIn, seeker.checkOut);
  const allowedDiff = (MATCH_RULES_CONFIG.MAX_BUDGET_DIFF_PERCENT / 100) * Math.min(seeker.budgetInr, group.budgetInr);
  const budgetDiff = Math.abs(seeker.budgetInr - group.budgetInr);
  const seatsLeft = group.maxSize - group.memberCount;

  const raw =
    RANK_WEIGHTS.INTERESTS * (seekerInterestCount ? shared.length / seekerInterestCount : 0) +
    RANK_WEIGHTS.DATES * (seekerNights ? clamp01(nightsShared / seekerNights) : 0) +
    RANK_WEIGHTS.BUDGET * (allowedDiff ? clamp01(1 - budgetDiff / allowedDiff) : 0) +
    RANK_WEIGHTS.OPEN_SEATS * clamp01(seatsLeft / group.maxSize);

  return { score: Math.round(raw * 10) / 10, sharedNights: nightsShared, sharedInterests: shared };
};

export interface Rankable {
  score: number;
  sharedNights: number;
  checkIn: string;
  groupId: string;
}

export const compareRanked = (a: Rankable, b: Rankable): number =>
  b.score - a.score ||
  b.sharedNights - a.sharedNights ||
  a.checkIn.localeCompare(b.checkIn) ||
  a.groupId.localeCompare(b.groupId);
