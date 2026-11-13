/**
 * Single source of truth for every business rule number.
 * Change a rule here and matching, validation and /api/meta all follow.
 * Values come from the problem statement (section 5) and DATA_DICTIONARY.md (section 5).
 */
export const MATCH_RULES_CONFIG = {
  /** Group and seeker must share at least this many nights. */
  MIN_SHARED_NIGHTS: 2,
  /** Budget difference may be at most this percent of the lower budget. */
  MAX_BUDGET_DIFF_PERCENT: 40,
  /** Seeker must share at least this many interests with the group owner. */
  MIN_SHARED_INTERESTS: 2,
} as const;

/** Data window: check_in from 1 April, check_out up to 20 April 2027. */
export const DATE_WINDOW = {
  FIRST_CHECK_IN: '2027-04-01',
  LAST_CHECK_OUT: '2027-04-20',
} as const;

/** "# of people wanted (1–4 total)", owner included. */
export const GROUP_SIZE = {
  MIN: 1,
  MAX: 4,
} as const;

/** Ranking weights for matched groups (sum = 100). Our own choice, per the FAQ. */
export const RANK_WEIGHTS = {
  INTERESTS: 40,
  DATES: 30,
  BUDGET: 20,
  OPEN_SEATS: 10,
} as const;

export const GENDERS = ['FEMALE', 'MALE'] as const;
export const GENDER_PREFERENCES = ['ANY', 'SAME_GENDER'] as const;

export type Gender = (typeof GENDERS)[number];
export type GenderPreference = (typeof GENDER_PREFERENCES)[number];
