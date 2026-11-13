import { beforeEach, describe, expect, it } from 'vitest';
import { anon, as, join, matchIds, requestJoin, resetDb, search, signUp } from './helpers';

const SARAH = 'T-001';
const PRIYA = 'T-002';
const GION_TWIN = 'RM-KYO-001-A';
const priyaSearch = {
  city: 'Kyoto',
  checkIn: '2027-04-09',
  checkOut: '2027-04-16',
  budgetInr: 62000,
  interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
  genderPreference: 'SAME_GENDER',
};

interface Option {
  roomId: string;
  totalInr: number;
  perMemberInr: number;
  rating: number;
  stars: number;
  rooms: number;
  available: boolean;
  minRoomsLeft: number;
}

const hotels = async (userId: string, query = '') => {
  const res = await as(userId).get(`/api/groups/G-01/hotels${query}`);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body.data as { total: number; page: number; limit: number; membersUsed: number; nights: number; options: Option[] };
};

const priyaJoins = () => join(SARAH, PRIYA, 'G-01', priyaSearch);

beforeEach(resetDb);

describe('M6 hotel search on the Common Group Page', () => {
  it('is for members only', async () => {
    expect((await as(PRIYA).get('/api/groups/G-01/hotels')).status).toBe(403);
    expect((await anon.get('/api/groups/G-01/hotels')).status).toBe(401);
    expect((await as(SARAH).get('/api/groups/G-nope/hotels')).status).toBe(404);
  });

  it('prices Gion Corner Twin for 1 member: ₹23,800 total', async () => {
    const r = await hotels(SARAH, '?limit=50');
    expect(r).toMatchObject({ membersUsed: 1, nights: 5 });
    const gion = r.options.find((o) => o.roomId === GION_TWIN);
    expect(gion).toMatchObject({ hotelName: 'Gion Corner Hotel', rooms: 1, totalInr: 23800, perMemberInr: 23800 });
  });

  it('splits ₹23,800 into ₹11,900 per member once Priya joins (data dictionary worked example)', async () => {
    await priyaJoins();
    const r = await hotels(PRIYA, '?limit=50');
    expect(r.membersUsed).toBe(2);
    expect(r.options.find((o) => o.roomId === GION_TWIN)).toMatchObject({ rooms: 1, totalInr: 23800, perMemberInr: 11900 });
    expect(r.options[0].roomId).toBe(GION_TWIN);
  });

  it('preview=full prices for maxSize members (3 → 2 twin rooms)', async () => {
    const r = await hotels(SARAH, '?preview=full&limit=50');
    expect(r.membersUsed).toBe(3);
    const gion = r.options.find((o) => o.roomId === GION_TWIN)!;
    expect(gion).toMatchObject({ rooms: 2, totalInr: 47600 });
    expect(gion.perMemberInr).toBeCloseTo(15866.67, 2);
    expect(r.total).toBe(26);
  });

  it('gives every option a total and a per-member cost, sorted by price ascending by default', async () => {
    const r = await hotels(SARAH, '?limit=50');
    expect(r.total).toBe(27);
    expect(r.options).toHaveLength(27);
    for (const o of r.options) {
      expect(o.totalInr).toBeGreaterThan(0);
      expect(o.perMemberInr).toBe(o.totalInr);
      expect(o.available).toBe(true);
      expect(o.minRoomsLeft).toBeGreaterThanOrEqual(o.rooms);
    }
    const totals = r.options.map((o) => o.totalInr);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
    expect(r.options[0]).toMatchObject({ roomId: 'RM-KYO-008-A', totalInr: 18480 });
  });

  it('never lists rooms that are sold out on any night of the stay', async () => {
    const ids = (await hotels(SARAH, '?limit=50')).options.map((o) => o.roomId);
    for (const soldOut of ['RM-KYO-007-A', 'RM-KYO-010-B', 'RM-KYO-011-C']) expect(ids).not.toContain(soldOut);
  });

  it('paginates with limit/page/total and keeps a stable order', async () => {
    const all = (await hotels(SARAH, '?limit=50')).options.map((o) => o.roomId);
    const p1 = await hotels(SARAH, '?limit=10&page=1');
    const p3 = await hotels(SARAH, '?limit=10&page=3');
    expect(p1).toMatchObject({ total: 27, page: 1, limit: 10 });
    expect(p1.options.map((o) => o.roomId)).toEqual(all.slice(0, 10));
    expect(p3.options.map((o) => o.roomId)).toEqual(all.slice(20));
    expect((await hotels(SARAH, '?limit=10&page=4')).options).toEqual([]);
    expect((await as(SARAH).get('/api/groups/G-01/hotels?limit=0')).status).toBe(400);
    expect((await as(SARAH).get('/api/groups/G-01/hotels?sort=cheapest')).status).toBe(400);
  });

  it('sorts by rating and filters by minStars', async () => {
    const byRating = (await hotels(SARAH, '?sort=rating&limit=50')).options.map((o) => o.rating);
    expect([...byRating].sort((a, b) => b - a)).toEqual(byRating);
    const fourStar = (await hotels(SARAH, '?minStars=4&limit=50')).options;
    expect(fourStar.length).toBeGreaterThan(0);
    expect(fourStar.every((o) => o.stars >= 4)).toBe(true);
  });

  it('uses the group’s own city: a Dubai group only sees Dubai hotels', async () => {
    const owner = await signUp();
    const res = await as(owner).post('/api/groups', {
      name: 'Dubai',
      city: 'Dubai',
      checkIn: '2027-04-08',
      checkOut: '2027-04-10',
      maxSize: 2,
      budgetInr: 80000,
      itinerary: 'Desert',
    });
    const r = await as(owner).get(`/api/groups/${res.body.data.id}/hotels?limit=50`);
    expect(r.status).toBe(200);
    expect(r.body.data.options.length).toBeGreaterThan(0);
    expect(r.body.data.options.every((o: Option) => o.roomId.startsWith('RM-DXB') || o.roomId.includes('DUB'))).toBe(true);
  });
});

describe('M6 save and compare', () => {
  it('saves, lists with alignment, and unsaves', async () => {
    await priyaJoins();
    const saved = await as(PRIYA).post('/api/groups/G-01/saved', { roomId: GION_TWIN });
    expect(saved.status).toBe(201);
    expect(saved.body.data).toMatchObject({ roomId: GION_TWIN, members: 2, rooms: 1, totalInr: 23800, perMemberInr: 11900 });

    let list = (await as(SARAH).get('/api/groups/G-01/saved')).body.data;
    expect(list).toEqual([expect.objectContaining({ roomId: GION_TWIN, savedCount: 1, alignment: '1/2 members' })]);

    expect((await as(SARAH).post('/api/groups/G-01/saved', { roomId: GION_TWIN })).status).toBe(201);
    expect((await as(SARAH).post('/api/groups/G-01/saved', { roomId: 'RM-KYO-001-B' })).status).toBe(201);
    list = (await as(PRIYA).get('/api/groups/G-01/saved')).body.data;
    expect(list[0]).toMatchObject({ roomId: GION_TWIN, savedCount: 2, memberCount: 2, alignment: '2/2 members', totalInr: 23800, perMemberInr: 11900 });
    expect(list[0].savedBy.map((s: { id: string }) => s.id).sort()).toEqual([SARAH, PRIYA]);
    expect(list[1]).toMatchObject({ roomId: 'RM-KYO-001-B', alignment: '1/2 members' });

    expect((await as(PRIYA).delete(`/api/groups/G-01/saved/${GION_TWIN}`)).status).toBe(200);
    expect((await as(PRIYA).delete(`/api/groups/G-01/saved/${GION_TWIN}`)).status).toBe(404);
    list = (await as(SARAH).get('/api/groups/G-01/saved')).body.data;
    expect(list.find((s: { roomId: string }) => s.roomId === GION_TWIN).alignment).toBe('1/2 members');
  });

  it('rejects duplicates (409), other-city or unknown rooms (400), sold-out rooms (409) and non-members (403)', async () => {
    expect((await as(SARAH).post('/api/groups/G-01/saved', { roomId: GION_TWIN })).status).toBe(201);
    expect((await as(SARAH).post('/api/groups/G-01/saved', { roomId: GION_TWIN })).status).toBe(409);
    const tokyo = await as(SARAH).post('/api/groups/G-01/saved', { roomId: 'RM-TYO-001-A' });
    expect(tokyo.status).toBe(400);
    expect(tokyo.body.message).toContain('Kyoto');
    expect((await as(SARAH).post('/api/groups/G-01/saved', { roomId: 'RM-NOPE' })).status).toBe(400);
    expect((await as(SARAH).post('/api/groups/G-01/saved', { roomId: 'RM-KYO-007-A' })).status).toBe(409);
    expect((await as(SARAH).post('/api/groups/G-01/saved', {})).status).toBe(400);
    expect((await as(PRIYA).post('/api/groups/G-01/saved', { roomId: GION_TWIN })).status).toBe(403);
    expect((await as(PRIYA).get('/api/groups/G-01/saved')).status).toBe(403);
  });
});

describe('M6 booking', () => {
  it('books once for the whole group and updates the cost split everywhere', async () => {
    await priyaJoins();
    expect((await as(PRIYA).get('/api/groups/G-01/booking')).status).toBe(404);

    const res = await as(PRIYA).post('/api/groups/G-01/booking', { roomId: GION_TWIN });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.stringMatching(/^BK-/),
      groupId: 'G-01',
      status: 'BOOKED',
      hotelName: 'Gion Corner Hotel',
      roomId: GION_TWIN,
      rooms: 1,
      nights: 5,
      members: 2,
      totalInr: 23800,
      perMemberInr: 11900,
      bookedBy: { id: PRIYA, name: expect.any(String) },
    });
    const bookingId = res.body.data.id;

    expect((await as(SARAH).get('/api/groups/G-01/booking')).body.data).toMatchObject({ id: bookingId, totalInr: 23800 });
    const group = (await anon.get('/api/groups/G-01')).body.data;
    expect(group).toMatchObject({ status: 'BOOKED', booking: { id: bookingId, totalInr: 23800, members: 2, perMemberInr: 11900 } });

    const second = await as(SARAH).post('/api/groups/G-01/booking', { roomId: 'RM-KYO-001-B' });
    expect(second.status).toBe(409);
    expect((await as(SARAH).post('/api/groups/G-01/saved', { roomId: GION_TWIN })).status).toBe(409);
    expect((await as(SARAH).delete(`/api/groups/G-01/saved/${GION_TWIN}`)).status).toBe(409);

    const seeker = await signUp({ gender: 'FEMALE', genderPreference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] });
    const after = await search(seeker, priyaSearch);
    expect(matchIds(after)).not.toContain('G-01');
    expect(after.nearMisses.map((n) => n.groupId)).not.toContain('G-01');
    expect((await requestJoin(seeker, 'G-01', after.searchId)).status).toBe(409);
    expect((await as(SARAH).get('/api/groups/mine')).body.data[0].status).toBe('BOOKED');
  });

  it('two parallel bookings: exactly one succeeds and one booking exists', async () => {
    await priyaJoins();
    const results = await Promise.all([
      as(SARAH).post('/api/groups/G-01/booking', { roomId: GION_TWIN }),
      as(PRIYA).post('/api/groups/G-01/booking', { roomId: 'RM-KYO-001-B' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const winner = results.find((r) => r.status === 201)!.body.data;
    expect((await as(SARAH).get('/api/groups/G-01/booking')).body.data).toMatchObject({ id: winner.id, roomId: winner.roomId });
  });

  it('rejects non-members (403), other-city rooms (400) and sold-out rooms (409) without booking', async () => {
    expect((await as(PRIYA).post('/api/groups/G-01/booking', { roomId: GION_TWIN })).status).toBe(403);
    expect((await as(SARAH).post('/api/groups/G-01/booking', { roomId: 'RM-TYO-001-A' })).status).toBe(400);
    expect((await as(SARAH).post('/api/groups/G-01/booking', { roomId: 'RM-KYO-007-A' })).status).toBe(409);
    expect((await anon.get('/api/groups/G-01')).body.data).toMatchObject({ status: 'OPEN', booking: null });
  });
});
