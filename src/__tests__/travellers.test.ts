import { beforeAll, describe, expect, it } from 'vitest';
import { anon, as, resetDb, signUp } from './helpers';

beforeAll(resetDb);

describe('GET /api/meta', () => {
  it('returns the 5 cities with timezones, 16 interests and the date window', async () => {
    const res = await anon.get('/api/meta');
    expect(res.status).toBe(200);
    const { cities, interests, dateWindow, groupSize, matchRules } = res.body.data;
    expect(cities.map((c: { name: string }) => c.name).sort()).toEqual(['Abu Dhabi', 'Dubai', 'Kyoto', 'Osaka', 'Tokyo']);
    const tz = Object.fromEntries(cities.map((c: { name: string; timezone: string }) => [c.name, c.timezone]));
    expect(tz).toMatchObject({ Tokyo: 'Asia/Tokyo', Kyoto: 'Asia/Tokyo', Osaka: 'Asia/Tokyo', Dubai: 'Asia/Dubai', 'Abu Dhabi': 'Asia/Dubai' });
    expect(interests).toHaveLength(16);
    expect(interests[0]).toMatchObject({ id: expect.any(String), label: expect.any(String), category: expect.any(String) });
    expect(dateWindow).toEqual({ FIRST_CHECK_IN: '2027-04-01', LAST_CHECK_OUT: '2027-04-20' });
    expect(groupSize).toEqual({ MIN: 1, MAX: 4 });
    expect(matchRules).toEqual({ MIN_SHARED_NIGHTS: 2, MAX_BUDGET_DIFF_PERCENT: 40, MIN_SHARED_INTERESTS: 2 });
  });
});

describe('M1 sign up', () => {
  const valid = {
    name: 'Anika Rao',
    age: 26,
    gender: 'FEMALE',
    homeCity: 'Chennai',
    homeAirport: 'MAA',
    genderPreference: 'SAME_GENDER',
    interests: ['TEMPLES', 'HIKING', 'TEMPLES'],
  };

  it('creates a traveller that persists and can act via X-User-Id', async () => {
    const res = await anon.post('/api/travellers', valid);
    expect(res.status).toBe(201);
    const id = res.body.data.id;
    expect(id).toMatch(/^T-/);
    expect(res.body.data).toMatchObject({ name: 'Anika Rao', interests: ['TEMPLES', 'HIKING'] });

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
    const res = await anon.post('/api/travellers', minimal);
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
    ['unknown interest', { interests: ['TEMPLES', 'SKYDIVING'] }],
    ['age below 18', { age: 17 }],
    ['non-integer age', { age: 25.5 }],
  ])('rejects %s with 400', async (_label, patch) => {
    const res = await anon.post('/api/travellers', { ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
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
