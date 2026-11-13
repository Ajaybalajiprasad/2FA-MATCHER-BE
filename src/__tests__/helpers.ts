import request, { type Test } from 'supertest';
import { expect } from 'vitest';
import app from '../app';

export { resetDb } from './testDb';

const withUser = (req: Test, userId?: string) => (userId ? req.set('X-User-Id', userId) : req);

export const as = (userId?: string) => ({
  get: (url: string) => withUser(request(app).get(url), userId),
  post: (url: string, body?: object) => withUser(request(app).post(url), userId).send(body),
  patch: (url: string, body?: object) => withUser(request(app).patch(url), userId).send(body),
  delete: (url: string) => withUser(request(app).delete(url), userId),
});

export const anon = as();

type Gender = 'FEMALE' | 'MALE';
type Pref = 'ANY' | 'SAME_GENDER';

export const signUp = async (
  overrides: Partial<{ name: string; gender: Gender; genderPreference: Pref; interests: string[]; age: number; homeCity: string }> = {}
): Promise<string> => {
  const res = await anon.post('/api/travellers', {
    name: 'Test Traveller',
    age: 28,
    gender: 'FEMALE',
    homeCity: 'Mumbai',
    genderPreference: 'ANY',
    interests: ['TEMPLES', 'STREET_FOOD'],
    ...overrides,
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data.id;
};

export const groupBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'Test Group',
  city: 'Kyoto',
  checkIn: '2027-04-10',
  checkOut: '2027-04-15',
  maxSize: 3,
  budgetInr: 60000,
  itinerary: 'Temples and food',
  ...overrides,
});

export const createGroup = async (ownerId: string, overrides: Record<string, unknown> = {}): Promise<string> => {
  const res = await as(ownerId).post('/api/groups', groupBody(overrides));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data.id;
};

export const searchBody = (overrides: Record<string, unknown> = {}) => ({
  homeCity: 'Mumbai',
  city: 'Kyoto',
  checkIn: '2027-04-10',
  checkOut: '2027-04-15',
  budgetInr: 60000,
  interests: ['TEMPLES', 'STREET_FOOD'],
  ...overrides,
});

export interface SearchResult {
  searchId: string;
  matches: { groupId: string; [k: string]: unknown }[];
  nearMisses: { groupId: string; failedRules: string[]; [k: string]: unknown }[];
}

export const search = async (userId: string, overrides: Record<string, unknown> = {}): Promise<SearchResult> => {
  const res = await as(userId).post('/api/matches/search', searchBody(overrides));
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body.data;
};

export const matchIds = (r: SearchResult) => r.matches.map((m) => m.groupId);
export const nearMissIds = (r: SearchResult) => r.nearMisses.map((m) => m.groupId);
export const failedRulesOf = (r: SearchResult, groupId: string) =>
  r.nearMisses.find((m) => m.groupId === groupId)?.failedRules;

export const requestJoin = (userId: string, groupId: string, searchId: string) =>
  as(userId).post(`/api/groups/${groupId}/requests`, { searchId });

// Seeker searches the group's own trip and requests; returns the request id.
export const searchAndRequest = async (seekerId: string, groupId: string, overrides: Record<string, unknown> = {}) => {
  const { searchId, matches } = await search(seekerId, overrides);
  expect(matches.map((m) => m.groupId)).toContain(groupId);
  const res = await requestJoin(seekerId, groupId, searchId);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data.id as string;
};

export const decide = (ownerId: string, requestId: string, action: 'APPROVE' | 'REJECT') =>
  as(ownerId).patch(`/api/requests/${requestId}`, { action });

export const join = async (ownerId: string, seekerId: string, groupId: string, overrides: Record<string, unknown> = {}) => {
  const requestId = await searchAndRequest(seekerId, groupId, overrides);
  const res = await decide(ownerId, requestId, 'APPROVE');
  expect(res.status, JSON.stringify(res.body)).toBe(200);
};
