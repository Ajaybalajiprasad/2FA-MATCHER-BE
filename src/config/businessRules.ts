export const MATCH_RULES_CONFIG = {
  MIN_SHARED_NIGHTS: 2,
  MAX_BUDGET_DIFF_PERCENT: 40,
  MIN_SHARED_INTERESTS: 2,
} as const;

export const DATE_WINDOW = {
  FIRST_CHECK_IN: '2027-04-01',
  LAST_CHECK_OUT: '2027-04-20',
} as const;

// Owner included.
export const GROUP_SIZE = {
  MIN: 1,
  MAX: 4,
} as const;

// Sums to 100.
export const RANK_WEIGHTS = {
  INTERESTS: 40,
  DATES: 30,
  BUDGET: 20,
  OPEN_SEATS: 10,
} as const;

export const GENDERS = ['FEMALE', 'MALE'] as const;
export const GENDER_PREFERENCES = ['ANY', 'SAME_GENDER'] as const;
export const HOTEL_SORTS = ['price', 'rating', 'stars'] as const;

export type Gender = (typeof GENDERS)[number];
export type GenderPreference = (typeof GENDER_PREFERENCES)[number];
