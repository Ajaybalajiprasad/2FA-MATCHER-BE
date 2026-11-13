import type { Gender, GenderPreference } from '../config/businessRules';

/** What a seeker enters in the search form (M3). */
export interface SeekerCriteria {
  city: string;
  checkIn: string;
  checkOut: string;
  budgetInr: number;
  interests: string[];
  gender: Gender;
  genderPreference: GenderPreference;
}

/** The group post fields the rules read. */
export interface GroupForMatch {
  id: string;
  city: string;
  checkIn: string;
  checkOut: string;
  budgetInr: number;
  maxSize: number;
  memberCount: number;
}

/** The owner profile fields the rules read. */
export interface OwnerForMatch {
  gender: Gender;
  genderPreference: GenderPreference;
  interests: string[];
}

export interface MatchContext {
  seeker: SeekerCriteria;
  group: GroupForMatch;
  owner: OwnerForMatch;
}

export type RuleId = 'SAME_CITY' | 'DATES_OVERLAP' | 'BUDGET' | 'SHARED_INTERESTS' | 'GENDER' | 'GROUP_SIZE';

export interface RuleResult {
  id: RuleId;
  label: string;
  pass: boolean;
  /** Human-readable reason, shown in the UI as the match reason. */
  detail: string;
}

export interface MatchEvaluation {
  matched: boolean;
  rules: RuleResult[];
  failedRules: RuleId[];
}
