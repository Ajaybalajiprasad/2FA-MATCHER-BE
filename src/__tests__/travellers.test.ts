import { beforeAll, describe, expect, it } from 'vitest';
import { anon, as, resetDb, signUp } from './helpers';

beforeAll(resetDb);

describe('GET /api/meta', () => {
  it('returns the 5 cities with timezones, 16 interests and the date window', async () => {
    const res = await anon.get('/api/meta');
    expect(res.status).toBe(200);
    const { cities, interests, dateWindow, groupSize, matchRules, genderMixes, hotelSorts } = res.body.data;
    expect(cities.map((c: { name: string }) => c.name).sort()).toEqual(['Abu Dhabi', 'Dubai', 'Kyoto', 'Osaka', 'Tokyo']);
    const tz = Object.fromEntries(cities.map((c: { name: string; timezone: string }) => [c.name, c.timezone]));
    expect(tz).toMatchObject({ Tokyo: 'Asia/Tokyo', Kyoto: 'Asia/Tokyo', Osaka: 'Asia/Tokyo', Dubai: 'Asia/Dubai', 'Abu Dhabi': 'Asia/Dubai' });
    expect(interests).toHaveLength(16);
    expect(interests[0]).toMatchObject({ id: expect.any(String), label: expect.any(String), category: expect.any(String) });
    expect(dateWindow).toEqual({ FIRST_CHECK_IN: '2027-04-01', LAST_CHECK_OUT: '2027-04-20' });
    expect(groupSize).toEqual({ MIN: 1, MAX: 4 });
    expect(genderMixes).toEqual(['ALL_FEMALE', 'ALL_MALE', 'MIXED']);
    expect(hotelSorts).toEqual(['price', 'rating', 'stars']);
    expect(matchRules).toEqual({ MIN_SHARED_NIGHTS: 2, MAX_BUDGET_DIFF_PERCENT: 40, MIN_SHARED_INTERESTS: 2 });
  });
});

describe('M1 sign up', () => {
  const valid = {
    name: 'Anika Rao',
    email: 'Anika@Example.com',
    password: 'anika-pass-1',
    age: 26,
    gender: 'FEMALE',
    homeCity: 'Chennai',
    homeAirport: 'MAA',
    genderPreference: 'SAME_GENDER',
    interests: ['TEMPLES', 'HIKING', 'TEMPLES'],
  };

  it('creates a traveller that persists and can act with its token', async () => {
    const res = await anon.post('/api/travellers', valid);
    expect(res.status).toBe(201);
    const id = res.body.data.id;
    expect(id).toMatch(/^T-/);
    expect(res.body.data).toMatchObject({ name: 'Anika Rao', interests: ['TEMPLES', 'HIKING'], token: expect.any(String) });
    expect(res.body.data).not.toHaveProperty('passwordHash');

    const byId = await anon.get(`/api/travellers/${id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.data).toMatchObject({
      id,
      name: 'Anika Rao',
      age: 26,
      gender: 'FEMALE',
      homeCity: 'Chennai',
      homeAirport: 'MAA',
      genderPreference: 'SAME_GENDER',
      interests: ['TEMPLES', 'HIKING'],
    });

    const me = await as(id).get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ id, name: 'Anika Rao' });

    const list = await anon.get('/api/travellers');
    expect(list.body.data.map((t: { id: string }) => t.id)).toEqual(expect.arrayContaining(['T-001', 'T-024', id]));
  });

  it('accepts a profile without optional age and airport', async () => {
    const { age: _a, homeAirport: _h, ...minimal } = valid;
    const res = await anon.post('/api/travellers', { ...minimal, email: 'minimal@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ age: null, homeAirport: null });
  });

  it.each([
    ['missing name', { name: undefined }],
    ['empty name', { name: '  ' }],
    ['missing gender', { gender: undefined }],
    ['bad gender', { gender: 'OTHER' }],
    ['bad gender preference', { genderPreference: 'FEMALE_ONLY' }],
    ['missing home city', { homeCity: undefined }],
    ['no interests', { interests: [] }],
    ['bad email', { email: 'not-an-email' }],
    ['short password', { password: 'short' }],
    ['unknown interest', { interests: ['TEMPLES', 'SKYDIVING'] }],
    ['age below 18', { age: 17 }],
    ['non-integer age', { age: 25.5 }],
  ])('rejects %s with 400', async (_label, patch) => {
    const res = await anon.post('/api/travellers', { ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('signs in with email (any case) and password, and rejects bad credentials', async () => {
    const ok = await anon.post('/api/travellers/sign-in', { email: 'ANIKA@example.com', password: 'anika-pass-1' });
    expect(ok.status).toBe(200);
    const me = await anon.get('/api/me').set('Authorization', `Bearer ${ok.body.data.token}`);
    expect(me.body.data).toMatchObject({ name: 'Anika Rao' });
    expect((await anon.post('/api/travellers/sign-in', { email: 'anika@example.com', password: 'wrong-pass' })).status).toBe(401);
    expect((await anon.post('/api/travellers/sign-in', { email: 'nobody@example.com', password: 'x' })).status).toBe(401);
  });

  it('rejects a second account with the same email', async () => {
    expect((await anon.post('/api/travellers', { ...valid, email: 'anika@example.com' })).status).toBe(409);
  });

  it('signs seeded travellers in with the demo password', async () => {
    const res = await anon.post('/api/travellers/sign-in', { email: 't-001@demo.travel', password: 'demo1234' });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('T-001');
  });

  it('demo switch signs in seeded travellers only', async () => {
    const list = await anon.get('/api/travellers/demo');
    expect(list.body.data.map((t: { id: string }) => t.id)).toContain('T-001');
    const ok = await anon.post('/api/travellers/demo/sign-in', { id: 'T-002' });
    expect(ok.status).toBe(200);
    expect((await anon.get('/api/me').set('Authorization', `Bearer ${ok.body.data.token}`)).body.data.id).toBe('T-002');
    const real = await signUp();
    expect((await anon.post('/api/travellers/demo/sign-in', { id: real })).status).toBe(403);
  });

  it('no longer trusts a raw X-User-Id header', async () => {
    expect((await anon.get('/api/me').set('X-User-Id', 'T-001')).status).toBe(401);
  });

  it('returns 404 for an unknown traveller id', async () => {
    const res = await anon.get('/api/travellers/T-nope');
    expect(res.status).toBe(404);
  });

  it('returns 401 from /me without a header or with an unknown traveller', async () => {
    expect((await anon.get('/api/me')).status).toBe(401);
    const unknown = await as('T-does-not-exist').get('/api/me');
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns seeded travellers by id (Sarah T-001)', async () => {
    const res = await anon.get('/api/travellers/T-001');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: 'Sarah Thomas',
      gender: 'FEMALE',
      genderPreference: 'SAME_GENDER',
      interests: ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY', 'BUDGET_STAYS'],
    });
  });
});

describe('persistence', () => {
  it('reads back state written through the API in later requests', async () => {
    const id = await signUp({ name: 'Persisted Pat' });
    const group = await as(id).post('/api/groups', {
      name: 'Persist Trip',
      city: 'Osaka',
      checkIn: '2027-04-03',
      checkOut: '2027-04-06',
      maxSize: 2,
      budgetInr: 40000,
      itinerary: 'Castle',
    });
    expect(group.status).toBe(201);

    // Each request goes through a fresh supertest server; nothing is cached in the app.
    const again = await as(id).get('/api/groups/mine');
    expect(again.body.data.map((g: { id: string }) => g.id)).toEqual([group.body.data.id]);
    expect((await anon.get(`/api/travellers/${id}`)).body.data.name).toBe('Persisted Pat');
  });
});
