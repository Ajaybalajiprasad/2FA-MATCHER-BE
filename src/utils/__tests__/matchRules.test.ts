import { describe, expect, it } from 'vitest';
import { evaluateMatch, isBudgetCompatible } from '../matchRules';
import type { MatchContext } from '../../types/match.types';

// Worked example from DATA_DICTIONARY.md section 2.
const priyaSearchesSarah = (): MatchContext => ({
  seeker: {
    city: 'Kyoto',
    checkIn: '2027-04-09',
    checkOut: '2027-04-16',
    budgetInr: 62000,
    interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
    gender: 'FEMALE',
    genderPreference: 'SAME_GENDER',
  },
  group: {
    id: 'G-01',
    city: 'Kyoto',
    checkIn: '2027-04-10',
    checkOut: '2027-04-15',
    budgetInr: 60000,
    maxSize: 3,
    memberCount: 1,
  },
  owner: {
    gender: 'FEMALE',
    genderPreference: 'SAME_GENDER',
    interests: ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY', 'BUDGET_STAYS'],
  },
});

const failed = (ctx: MatchContext) => evaluateMatch(ctx).failedRules;

describe('matchRules', () => {
  it('Priya matches Sarah\'s group G-01 on all 6 rules', () => {
    const result = evaluateMatch(priyaSearchesSarah());
    expect(result.matched).toBe(true);
    expect(result.rules).toHaveLength(6);
  });

  it('same destination: Kyoto vs Osaka fails', () => {
    const ctx = priyaSearchesSarah();
    ctx.seeker.city = 'Osaka';
    expect(failed(ctx)).toEqual(['SAME_CITY']);
  });

  it('dates: 1 shared night fails, 2 passes', () => {
    const ctx = priyaSearchesSarah();
    ctx.seeker.checkIn = '2027-04-14';
    ctx.seeker.checkOut = '2027-04-18';
    expect(failed(ctx)).toEqual(['DATES_OVERLAP']);
    ctx.seeker.checkIn = '2027-04-13';
    expect(failed(ctx)).toEqual([]);
  });

  it('budget: 60k vs 84k (exactly 40%) passes, 60k vs 85k fails', () => {
    expect(isBudgetCompatible(60000, 84000)).toBe(true);
    expect(isBudgetCompatible(84000, 60000)).toBe(true);
    expect(isBudgetCompatible(60000, 85000)).toBe(false);
    expect(isBudgetCompatible(60000, 84001)).toBe(false);
    const ctx = priyaSearchesSarah();
    ctx.seeker.budgetInr = 85000;
    expect(failed(ctx)).toEqual(['BUDGET']);
  });

  it('interests: 1 shared fails, 2 passes', () => {
    const ctx = priyaSearchesSarah();
    ctx.seeker.interests = ['TEMPLES', 'ADVENTURE'];
    expect(failed(ctx)).toEqual(['SHARED_INTERESTS']);
  });

  it('gender: a male seeker does not match a female-only owner', () => {
    const ctx = priyaSearchesSarah();
    ctx.seeker.gender = 'MALE';
    ctx.seeker.genderPreference = 'ANY';
    expect(failed(ctx)).toEqual(['GENDER']);
  });

  it('gender: checks both ways', () => {
    const ctx = priyaSearchesSarah();
    ctx.owner.gender = 'MALE';
    ctx.owner.genderPreference = 'ANY';
    expect(failed(ctx)).toEqual(['GENDER']);
    ctx.seeker.genderPreference = 'ANY';
    expect(failed(ctx)).toEqual([]);
  });

  it('group size: 2 of 3 matches, 3 of 3 is full', () => {
    const ctx = priyaSearchesSarah();
    ctx.group.memberCount = 2;
    expect(failed(ctx)).toEqual([]);
    ctx.group.memberCount = 3;
    expect(failed(ctx)).toEqual(['GROUP_SIZE']);
  });

  it('reports every failed rule, not only the first', () => {
    const ctx = priyaSearchesSarah();
    ctx.seeker.city = 'Dubai';
    ctx.seeker.budgetInr = 200000;
    expect(failed(ctx)).toEqual(['SAME_CITY', 'BUDGET']);
  });
});
