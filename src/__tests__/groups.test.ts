import { beforeAll, describe, expect, it } from 'vitest';
import { anon, as, groupBody, resetDb, signUp } from './helpers';

let owner: string;

beforeAll(async () => {
  await resetDb();
  owner = await signUp({ name: 'Olivia Owner' });
});

describe('M2 create group', () => {
  it('creates a group with the owner as its only member', async () => {
    const res = await as(owner).post('/api/groups', groupBody({ name: 'Kyoto Blossoms', maxSize: 4, budgetInr: 55000 }));
    expect(res.status).toBe(201);
    const g = res.body.data;
    expect(g.id).toMatch(/^G-/);
    expect(g).toMatchObject({
      name: 'Kyoto Blossoms',
      city: 'Kyoto',
      checkIn: '2027-04-10',
      checkOut: '2027-04-15',
      maxSize: 4,
      budgetInr: 55000,
      ownerId: owner,
      status: 'OPEN',
      memberCount: 1,
      seatsLeft: 3,
      timezone: 'Asia/Tokyo',
      owner: { id: owner, name: 'Olivia Owner' },
      booking: null,
    });
    expect(g.members.map((m: { id: string }) => m.id)).toEqual([owner]);

    const fetched = await anon.get(`/api/groups/${g.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data).toMatchObject({ id: g.id, memberCount: 1, seatsLeft: 3 });

    const mine = await as(owner).get('/api/groups/mine');
    expect(mine.status).toBe(200);
    expect(mine.body.data).toContainEqual(expect.objectContaining({ id: g.id, role: 'OWNER', pendingRequestCount: 0 }));
  });

  it.each([
    ['Tokyo', '2027-04-01', '2027-04-20'],
    ['Dubai', '2027-04-19', '2027-04-20'],
    ['Abu Dhabi', '2027-04-05', '2027-04-08'],
    ['Osaka', '2027-04-10', '2027-04-12'],
  ])('accepts %s from %s to %s (window edges included)', async (city, checkIn, checkOut) => {
    const res = await as(owner).post('/api/groups', groupBody({ city, checkIn, checkOut }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ city, checkIn, checkOut });
  });

  it('accepts maxSize 1 (solo post) and 4', async () => {
    expect((await as(owner).post('/api/groups', groupBody({ maxSize: 1 }))).status).toBe(201);
    expect((await as(owner).post('/api/groups', groupBody({ maxSize: 4 }))).status).toBe(201);
  });

  it('rejects a city outside the data with OUT_OF_DATA_RANGE', async () => {
    const res = await as(owner).post('/api/groups', groupBody({ city: 'Paris' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OUT_OF_DATA_RANGE');
    expect(res.body.message).toContain('Kyoto');
  });

  it('rejects a lowercase city name (no fuzzy matching)', async () => {
    expect((await as(owner).post('/api/groups', groupBody({ city: 'kyoto' }))).status).toBe(400);
  });

  it.each([
    ['check-in before the window', { checkIn: '2027-03-31', checkOut: '2027-04-03' }],
    ['check-out after the window', { checkIn: '2027-04-18', checkOut: '2027-04-21' }],
    ['check-out equal to check-in', { checkIn: '2027-04-10', checkOut: '2027-04-10' }],
    ['check-out before check-in', { checkIn: '2027-04-12', checkOut: '2027-04-10' }],
    ['an impossible date', { checkIn: '2027-02-30', checkOut: '2027-04-03' }],
    ['a non-ISO date', { checkIn: '10/04/2027', checkOut: '2027-04-15' }],
    ['the wrong year', { checkIn: '2026-04-10', checkOut: '2026-04-15' }],
  ])('rejects %s with 400', async (_label, dates) => {
    const res = await as(owner).post('/api/groups', groupBody(dates));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OUT_OF_DATA_RANGE');
  });

  it.each([
    ['maxSize 0', { maxSize: 0 }],
    ['maxSize 5', { maxSize: 5 }],
    ['fractional maxSize', { maxSize: 2.5 }],
    ['zero budget', { budgetInr: 0 }],
    ['negative budget', { budgetInr: -100 }],
    ['budget as string', { budgetInr: '60000' }],
    ['missing name', { name: undefined }],
    ['missing itinerary', { itinerary: undefined }],
    ['missing dates', { checkIn: undefined }],
  ])('rejects %s with VALIDATION_FAILED', async (_label, patch) => {
    const res = await as(owner).post('/api/groups', groupBody(patch));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('requires a known user', async () => {
    expect((await anon.post('/api/groups', groupBody())).status).toBe(401);
    expect((await as('T-ghost').post('/api/groups', groupBody())).status).toBe(401);
  });

  it('returns 404 for an unknown group', async () => {
    expect((await anon.get('/api/groups/G-nope')).status).toBe(404);
  });

  it('lists seeded groups for their owner and members', async () => {
    const mine = await as('T-001').get('/api/groups/mine');
    expect(mine.body.data).toEqual([expect.objectContaining({ id: 'G-01', role: 'OWNER', memberCount: 1, seatsLeft: 2 })]);
    const g07 = await anon.get('/api/groups/G-07');
    expect(g07.body.data).toMatchObject({ memberCount: 3, maxSize: 3, seatsLeft: 0 });
    const memberId = g07.body.data.members.find((m: { id: string }) => m.id !== 'T-010').id;
    const memberView = await as(memberId).get('/api/groups/mine');
    expect(memberView.body.data).toContainEqual(expect.objectContaining({ id: 'G-07', role: 'MEMBER', pendingRequestCount: null }));
  });
});
