import { describe, expect, it } from 'vitest';
import { genderComposition, passesFilters } from '../matchFilters';

describe('genderComposition', () => {
  it('classifies the mix', () => {
    expect(genderComposition(2, 0)).toEqual({ female: 2, male: 0, mix: 'ALL_FEMALE' });
    expect(genderComposition(0, 1)).toEqual({ female: 0, male: 1, mix: 'ALL_MALE' });
    expect(genderComposition(1, 2)).toEqual({ female: 1, male: 2, mix: 'MIXED' });
  });
});

describe('passesFilters', () => {
  const shared = ['TEMPLES', 'STREET_FOOD'];
  const allFemale = genderComposition(2, 0);

  it('passes with no filters', () => {
    expect(passesFilters(shared, allFemale)).toBe(true);
    expect(passesFilters(shared, allFemale, {})).toBe(true);
  });

  it('requires every listed interest to be shared', () => {
    expect(passesFilters(shared, allFemale, { sharedInterests: ['TEMPLES'] })).toBe(true);
    expect(passesFilters(shared, allFemale, { sharedInterests: ['TEMPLES', 'ADVENTURE'] })).toBe(false);
  });

  it('applies the minimum shared count inclusively', () => {
    expect(passesFilters(shared, allFemale, { minSharedInterests: 2 })).toBe(true);
    expect(passesFilters(shared, allFemale, { minSharedInterests: 3 })).toBe(false);
  });

  it('matches the gender mix', () => {
    expect(passesFilters(shared, allFemale, { genderMix: 'ALL_FEMALE' })).toBe(true);
    expect(passesFilters(shared, allFemale, { genderMix: 'MIXED' })).toBe(false);
  });

  it('combines filters with AND', () => {
    expect(passesFilters(shared, allFemale, { sharedInterests: ['TEMPLES'], genderMix: 'ALL_MALE' })).toBe(false);
  });
});
