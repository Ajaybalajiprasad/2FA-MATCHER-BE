import type { Gender, GenderPreference } from '../config/businessRules';

export interface SeekerCriteria {
  city: string;
  checkIn: string;
  checkOut: string;
  budgetInr: number;
  interests: string[];
  gender: Gender;
  genderPreference: GenderPreference;
}

export interface GroupForMatch {
  id: string;
  city: string;
  checkIn: string;
  checkOut: string;
  budgetInr: number;
  maxSize: number;
  memberCount: number;
  genderPreference: string; // ANY | SAME_GENDER, set per trip
  memberGenders: { female: number; male: number };
}

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
  detail: string;
}

export interface MatchEvaluation {
  matched: boolean;
  rules: RuleResult[];
  failedRules: RuleId[];
}
