import { MATCH_RULES_CONFIG, type Gender, type GenderPreference } from '../config/businessRules';
import type { MatchContext, MatchEvaluation, RuleId, RuleResult } from '../types/match.types';
import { sharedNights } from './dateUtils';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const sharedInterests = (a: string[], b: string[]): string[] => {
  const other = new Set(b);
  return [...new Set(a)].filter((i) => other.has(i));
};

// Integer math so the exact 40% boundary passes.
export const isBudgetCompatible = (a: number, b: number): boolean =>
  Math.abs(a - b) * 100 <= MATCH_RULES_CONFIG.MAX_BUDGET_DIFF_PERCENT * Math.min(a, b);

export const seatsLeft = (memberCount: number, maxSize: number): number => Math.max(0, maxSize - memberCount);

export const hasSeatFor = (memberCount: number, maxSize: number): boolean => memberCount + 1 <= maxSize;

export const genderAllows = (preference: GenderPreference, ownGender: Gender, otherGender: Gender): boolean =>
  preference === 'ANY' || ownGender === otherGender;

interface MatchRule {
  id: RuleId;
  label: string;
  check: (ctx: MatchContext) => { pass: boolean; detail: string };
}

export const MATCH_RULES: MatchRule[] = [
  {
    id: 'SAME_CITY',
    label: 'Same destination',
    check: ({ seeker, group }) => {
      const pass = seeker.city === group.city;
      return { pass, detail: pass ? `Both go to ${group.city}` : `${seeker.city} ≠ ${group.city}` };
    },
  },
  {
    id: 'DATES_OVERLAP',
    label: 'Dates overlap',
    check: ({ seeker, group }) => {
      const shared = sharedNights(seeker, group);
      const pass = shared.count >= MATCH_RULES_CONFIG.MIN_SHARED_NIGHTS;
      const range = shared.count > 0 ? ` (${shared.firstNight} to ${shared.lastNight})` : '';
      return {
        pass,
        detail: `${shared.count} shared night${shared.count === 1 ? '' : 's'}${range}, need ${MATCH_RULES_CONFIG.MIN_SHARED_NIGHTS}`,
      };
    },
  },
  {
    id: 'BUDGET',
    label: 'Budget compatible',
    check: ({ seeker, group }) => {
      const diff = Math.abs(seeker.budgetInr - group.budgetInr);
      const lower = Math.min(seeker.budgetInr, group.budgetInr);
      const allowed = (lower * MATCH_RULES_CONFIG.MAX_BUDGET_DIFF_PERCENT) / 100;
      const pass = isBudgetCompatible(seeker.budgetInr, group.budgetInr);
      return {
        pass,
        detail: `Difference ${inr(diff)} ${pass ? '≤' : '>'} ${inr(allowed)} (${MATCH_RULES_CONFIG.MAX_BUDGET_DIFF_PERCENT}% of ${inr(lower)})`,
      };
    },
  },
  {
    id: 'SHARED_INTERESTS',
    label: 'Shared interests',
    check: ({ seeker, owner }) => {
      const shared = sharedInterests(seeker.interests, owner.interests);
      const pass = shared.length >= MATCH_RULES_CONFIG.MIN_SHARED_INTERESTS;
      return {
        pass,
        detail: `${shared.length} shared with owner${shared.length ? `: ${shared.join(', ')}` : ''}, need ${MATCH_RULES_CONFIG.MIN_SHARED_INTERESTS}`,
      };
    },
  },
  {
    id: 'GENDER',
    label: 'Gender preference',
    check: ({ seeker, owner }) => {
      const seekerOk = genderAllows(seeker.genderPreference, seeker.gender, owner.gender);
      const ownerOk = genderAllows(owner.genderPreference, owner.gender, seeker.gender);
      const pass = seekerOk && ownerOk;
      let detail = 'Both preferences allow each other';
      if (!ownerOk) detail = `Owner travels only with ${owner.gender.toLowerCase()} travellers`;
      else if (!seekerOk) detail = `You prefer ${seeker.gender.toLowerCase()} only; owner is ${owner.gender.toLowerCase()}`;
      return { pass, detail };
    },
  },
  {
    id: 'GROUP_SIZE',
    label: 'Group has space',
    check: ({ group }) => {
      const pass = hasSeatFor(group.memberCount, group.maxSize);
      return {
        pass,
        detail: pass
          ? `${group.memberCount}/${group.maxSize} members, ${seatsLeft(group.memberCount, group.maxSize)} place(s) left`
          : `Group is full (${group.memberCount}/${group.maxSize})`,
      };
    },
  },
];

export const evaluateMatch = (ctx: MatchContext): MatchEvaluation => {
  const rules: RuleResult[] = MATCH_RULES.map((rule) => ({ id: rule.id, label: rule.label, ...rule.check(ctx) }));
  const failedRules = rules.filter((r) => !r.pass).map((r) => r.id);
  return { matched: failedRules.length === 0, rules, failedRules };
};
