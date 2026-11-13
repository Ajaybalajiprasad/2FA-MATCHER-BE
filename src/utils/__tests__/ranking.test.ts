import { describe, expect, it } from 'vitest';
import { compareRanked, rankScore } from '../ranking';
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
  group: { id: 'G-01', city: 'Kyoto', checkIn: '2027-04-10', checkOut: '2027-04-15', budgetInr: 60000, maxSize: 3, memberCount: 1, genderPreference: 'SAME_GENDER', memberGenders: { female: 1, male: 0 } },
  owner: {
    gender: 'FEMALE',
    genderPreference: 'SAME_GENDER',
    interests: ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY', 'BUDGET_STAYS'],
  },
});

describe('rankScore', () => {
  it('scores the Sarah/Priya example', () => {
    // 40*2/3 + 30*5/7 + 20*(1 - 2000/24000) + 10*2/3 = 73.095...
    expect(rankScore(priyaSearchesSarah())).toEqual({
      score: 73.1,
      sharedNights: 5,
      sharedInterests: ['TEMPLES', 'STREET_FOOD'],
    });
  });

  it('gives 100 for a perfect fit', () => {
    const ctx = priyaSearchesSarah();
    ctx.seeker = { ...ctx.seeker, checkIn: '2027-04-10', checkOut: '2027-04-15', budgetInr: 60000, interests: ['TEMPLES', 'STREET_FOOD'] };
    ctx.group = { ...ctx.group, memberCount: 0 };
    expect(rankScore(ctx).score).toBe(100);
  });

  it('never gives a negative budget part', () => {
    const ctx = priyaSearchesSarah();
    ctx.seeker.budgetInr = 200000;
    expect(rankScore(ctx).score).toBeCloseTo(26.7 + 21.4 + 6.7, 0);
  });
});

describe('compareRanked', () => {
  it('sorts by score, shared nights, check-in, then group id', () => {
    const items = [
      { groupId: 'G-03', score: 50, sharedNights: 3, checkIn: '2027-04-05' },
      { groupId: 'G-02', score: 50, sharedNights: 3, checkIn: '2027-04-05' },
      { groupId: 'G-04', score: 50, sharedNights: 3, checkIn: '2027-04-02' },
      { groupId: 'G-05', score: 50, sharedNights: 4, checkIn: '2027-04-09' },
      { groupId: 'G-06', score: 60, sharedNights: 2, checkIn: '2027-04-09' },
    ];
    expect(items.sort(compareRanked).map((i) => i.groupId)).toEqual(['G-06', 'G-05', 'G-04', 'G-02', 'G-03']);
  });
});
