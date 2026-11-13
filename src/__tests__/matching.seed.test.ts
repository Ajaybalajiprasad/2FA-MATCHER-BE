import { beforeAll, describe, expect, it } from 'vitest';
import { as, failedRulesOf, matchIds, nearMissIds, resetDb, search, type SearchResult } from './helpers';

const priyaSearch = {
  homeCity: 'Mumbai',
  city: 'Kyoto',
  checkIn: '2027-04-09',
  checkOut: '2027-04-16',
  budgetInr: 62000,
  interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
  genderPreference: 'SAME_GENDER',
};

let result: SearchResult;

beforeAll(async () => {
  await resetDb();
  result = await search('T-002', priyaSearch);
});

describe('M3/M4 worked example: Priya (T-002) searches Kyoto', () => {
  it('stores the search and echoes the criteria with the profile gender', () => {
    expect(result.searchId).toMatch(/^S-/);
    expect((result as unknown as { criteria: object }).criteria).toMatchObject({
      city: 'Kyoto',
      checkIn: '2027-04-09',
      checkOut: '2027-04-16',
      budgetInr: 62000,
      gender: 'FEMALE',
      genderPreference: 'SAME_GENDER',
      homeCity: 'Mumbai',
    });
  });

  it('matches exactly G-01 then G-08, ranked by score', () => {
    expect(matchIds(result)).toEqual(['G-01', 'G-08']);
    const [g01, g08] = result.matches;
    expect(g01).toMatchObject({
      name: 'Kyoto Spring Temples',
      city: 'Kyoto',
      checkIn: '2027-04-10',
      checkOut: '2027-04-15',
      memberCount: 1,
      maxSize: 3,
      seatsLeft: 2,
      ownerId: 'T-001',
      ownerName: 'Sarah Thomas',
      sharedNights: 5,
      sharedInterests: ['TEMPLES', 'STREET_FOOD'],
      score: 73.1,
    });
    expect(g08).toMatchObject({ city: 'Kyoto', checkIn: '2027-04-10', checkOut: '2027-04-14', memberCount: 1, sharedNights: 4, score: 64.9 });
    expect(g08.ownerName).toEqual(expect.any(String));
    expect(g08.name).toEqual(expect.any(String));
  });

  it('returns all 6 passing rules with readable details for each match', () => {
    for (const m of result.matches) {
      const rules = m.rules as { id: string; pass: boolean; detail: string }[];
      expect(rules.map((r) => r.id)).toEqual(['SAME_CITY', 'DATES_OVERLAP', 'BUDGET', 'SHARED_INTERESTS', 'GENDER', 'GROUP_SIZE']);
      expect(rules.every((r) => r.pass && r.detail.length > 0)).toBe(true);
    }
    const g01Dates = (result.matches[0].rules as { id: string; detail: string }[]).find((r) => r.id === 'DATES_OVERLAP');
    expect(g01Dates?.detail).toBe('5 shared nights (2027-04-10 to 2027-04-14), need 2');
  });

  it('reports each near miss with exactly one failed rule and a suggestion', () => {
    expect(failedRulesOf(result, 'G-06')).toEqual(['GENDER']);
    expect(failedRulesOf(result, 'G-07')).toEqual(['GROUP_SIZE']);
    expect(failedRulesOf(result, 'G-02')).toEqual(['DATES_OVERLAP']);
    expect(failedRulesOf(result, 'G-05')).toEqual(['SHARED_INTERESTS']);
    expect(failedRulesOf(result, 'G-04')).toEqual(['BUDGET']);
    expect(nearMissIds(result).sort()).toEqual(['G-02', 'G-04', 'G-05', 'G-06', 'G-07']);
    for (const nm of result.nearMisses) {
      expect(nm.suggestions).toEqual([{ rule: nm.failedRules[0], suggestion: expect.any(String) }]);
    }
    const budget = result.nearMisses.find((n) => n.groupId === 'G-04')!.suggestions as { suggestion: string }[];
    expect(budget[0].suggestion).toBe('Set a budget between ₹62,143 and ₹1,21,800');
  });

  it('never returns groups from other cities in matches or near misses', () => {
    const all = [...result.matches, ...result.nearMisses];
    expect(all.every((g) => g.city === 'Kyoto')).toBe(true);
    for (const other of ['G-03', 'G-09', 'G-10', 'G-11', 'G-12']) expect(all.map((g) => g.groupId)).not.toContain(other);
  });

  it('falls back to the profile gender preference when the search omits it', async () => {
    const { genderPreference: _g, ...noPref } = priyaSearch;
    const r = await search('T-002', noPref);
    expect(matchIds(r)).toEqual(['G-01', 'G-08']);
    expect(failedRulesOf(r, 'G-06')).toEqual(['GENDER']);
  });

  it('matches male-owned G-06 (owner ANY) once Priya switches to ANY', async () => {
    const r = await search('T-002', { ...priyaSearch, genderPreference: 'ANY' });
    expect(matchIds(r)).toContain('G-06');
  });
});

describe('M3 search validation', () => {
  it.each([
    ['unknown city', { city: 'Bangkok' }, 'OUT_OF_DATA_RANGE'],
    ['date before window', { checkIn: '2027-03-31' }, 'OUT_OF_DATA_RANGE'],
    ['date after window', { checkOut: '2027-04-21' }, 'OUT_OF_DATA_RANGE'],
    ['check-out before check-in', { checkIn: '2027-04-12', checkOut: '2027-04-11' }, 'OUT_OF_DATA_RANGE'],
    ['impossible date', { checkOut: '2027-04-31' }, 'OUT_OF_DATA_RANGE'],
    ['unknown interest', { interests: ['TEMPLES', 'CASINOS'] }, 'VALIDATION_FAILED'],
    ['no interests', { interests: [] }, 'VALIDATION_FAILED'],
    ['missing budget', { budgetInr: undefined }, 'VALIDATION_FAILED'],
    ['bad gender preference', { genderPreference: 'FEMALE' }, 'VALIDATION_FAILED'],
  ])('rejects %s with 400', async (_label, patch, code) => {
    const res = await as('T-002').post('/api/matches/search', { ...priyaSearch, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
  });

  it('requires a known user', async () => {
    expect((await as().post('/api/matches/search', priyaSearch)).status).toBe(401);
  });
});
