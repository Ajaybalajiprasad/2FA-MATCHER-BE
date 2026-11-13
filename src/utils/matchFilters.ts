export const GENDER_MIXES = ['ALL_FEMALE', 'ALL_MALE', 'MIXED'] as const;
export type GenderMix = (typeof GENDER_MIXES)[number];

export interface GenderComposition {
  female: number;
  male: number;
  mix: GenderMix;
}

export interface MatchFilters {
  sharedInterests?: string[];
  minSharedInterests?: number;
  genderMix?: GenderMix;
}

export const genderComposition = (female: number, male: number): GenderComposition => ({
  female,
  male,
  mix: female > 0 && male > 0 ? 'MIXED' : male > 0 ? 'ALL_MALE' : 'ALL_FEMALE',
});

export const passesFilters = (
  shared: string[],
  composition: GenderComposition,
  filters: MatchFilters = {}
): boolean =>
  (filters.sharedInterests ?? []).every((i) => shared.includes(i)) &&
  shared.length >= (filters.minSharedInterests ?? 0) &&
  (!filters.genderMix || filters.genderMix === composition.mix);
