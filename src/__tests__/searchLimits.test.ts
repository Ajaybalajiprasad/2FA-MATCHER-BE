import { beforeAll, describe, expect, it } from 'vitest';
import { db } from './testDb';
import { groupMembers, groups } from '../db/schema';
import { as, resetDb, searchBody, signUp } from './helpers';

let seekerId: string;
beforeAll(async () => {
  await resetDb();
  const ownerId = await signUp({ name: 'Limit Owner' });
  seekerId = await signUp({ name: 'Limit Seeker' });
  const rows = Array.from({ length: 110 }, (_, index) => ({
    id: `G-LIMIT-${String(index).padStart(3, '0')}`,
    name: `Limit test ${index}`,
    ownerId,
    city: 'Kyoto',
    checkIn: '2027-04-10',
    checkOut: '2027-04-15',
    maxSize: 3,
    budgetInr: index < 55 ? 60000 : 100000,
    itinerary: 'Temples and street food',
    status: 'OPEN',
  }));
  await db.insert(groups).values(rows);
  await db.insert(groupMembers).values(rows.map((row) => ({ groupId: row.id, travellerId: ownerId })));
});

describe('Bounded discovery results', () => {
  it('returns ranked top matches and near misses with truthful totals, consistently across searches', async () => {
    const first = await as(seekerId).post('/api/matches/search', searchBody());
    expect(first.status).toBe(200);
    const data = first.body.data;
    expect(data.limits).toEqual({ matches: 50, nearMisses: 50 });
    expect(data.matches).toHaveLength(50);
    expect(data.totalMatches).toBeGreaterThanOrEqual(55);
    expect(data.nearMisses).toHaveLength(50);
    expect(data.totalNearMisses).toBeGreaterThanOrEqual(55);
    expect(data.matches.every((match: { rules: { pass: boolean }[] }) => match.rules.every((rule) => rule.pass))).toBe(true);
    const again = await as(seekerId).post('/api/matches/search', searchBody());
    expect(again.body.data.matches.map((match: { groupId: string }) => match.groupId))
      .toEqual(data.matches.map((match: { groupId: string }) => match.groupId));
  });

  it('filters before counting/capping, so excluded groups never fill the result window', async () => {
    const result = await as(seekerId).post('/api/matches/search', searchBody({ filters: { sharedInterests: ['NIGHTLIFE'] } }));
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ totalMatches: 0, totalNearMisses: 0, matches: [], nearMisses: [] });
    expect(result.body.data.totalBeforeFilters.matches).toBeGreaterThanOrEqual(55);
  });
});

