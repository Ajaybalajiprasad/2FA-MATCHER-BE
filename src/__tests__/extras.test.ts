import { beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createGroup, join, matchIds, resetDb, search, signUp } from './helpers';

const priyaSearch = {
  city: 'Kyoto',
  checkIn: '2027-04-09',
  checkOut: '2027-04-16',
  budgetInr: 62000,
  interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
  genderPreference: 'SAME_GENDER',
};

beforeAll(resetDb);

const ids = (r: { matches: { groupId: string }[]; nearMisses: { groupId: string }[] }) => ({
  matches: r.matches.map((m) => m.groupId),
  nearMisses: r.nearMisses.map((m) => m.groupId),
});

const isSubset = (sub: string[], all: string[]) => sub.every((x) => all.includes(x));

describe('G1 filters and gender composition', () => {
  it('reports genderComposition counts on every result', async () => {
    const r = await search('T-002', priyaSearch);
    expect(r.matches[0]).toMatchObject({ groupId: 'G-01', genderComposition: { female: 1, male: 0, mix: 'ALL_FEMALE' } });
    const g07 = r.nearMisses.find((n) => n.groupId === 'G-07')!;
    const comp = g07.genderComposition as { female: number; male: number };
    expect(comp.female + comp.male).toBe(3);
    const g06 = r.nearMisses.find((n) => n.groupId === 'G-06')!;
    expect(g06.genderComposition).toMatchObject({ male: 1, female: 0, mix: 'ALL_MALE' });
  });

  it('counts a mixed group after a woman joins a man’s group', async () => {
    const owner = await signUp({ gender: 'MALE', genderPreference: 'ANY', interests: ['DESERT', 'BEACHES'] });
    const trip = { city: 'Dubai', checkIn: '2027-04-02', checkOut: '2027-04-06' };
    const group = await createGroup(owner, { ...trip, maxSize: 4 });
    await join(owner, await signUp({ gender: 'FEMALE' }), group, { ...trip, interests: ['DESERT', 'BEACHES'] });
    const r = await search(await signUp({ gender: 'MALE' }), { ...trip, interests: ['DESERT', 'BEACHES'], filters: { genderMix: 'MIXED' } });
    expect(r.matches).toEqual([expect.objectContaining({ groupId: group, genderComposition: { female: 1, male: 1, mix: 'MIXED' } })]);
  });

  it.each([
    [{ genderMix: 'ALL_MALE' }],
    [{ genderMix: 'ALL_FEMALE' }],
    [{ genderMix: 'MIXED' }],
    [{ minSharedInterests: 2 }],
    [{ minSharedInterests: 3 }],
    [{ sharedInterests: ['TEMPLES'] }],
    [{ sharedInterests: ['PHOTOGRAPHY'] }],
    [{ sharedInterests: ['NIGHTLIFE'], genderMix: 'ALL_FEMALE' }],
  ])('filters %j only narrow the unfiltered results', async (filters) => {
    const base = ids(await search('T-002', priyaSearch));
    const res = await as('T-002').post('/api/matches/search', { ...priyaSearch, filters });
    expect(res.status).toBe(200);
    const filtered = ids(res.body.data);
    expect(isSubset(filtered.matches, base.matches)).toBe(true);
    expect(isSubset(filtered.nearMisses, base.nearMisses)).toBe(true);
    expect(res.body.data.filters).toEqual(filters);
    expect(res.body.data.totalBeforeFilters).toEqual({ matches: base.matches.length, nearMisses: base.nearMisses.length });
  });

  it('narrows to exactly the expected groups', async () => {
    const r = await search('T-002', { ...priyaSearch, filters: { sharedInterests: ['STREET_FOOD'], genderMix: 'ALL_FEMALE' } });
    expect(matchIds(r)).toEqual(['G-01', 'G-08']);
    expect(matchIds(await search('T-002', { ...priyaSearch, filters: { genderMix: 'ALL_MALE' } }))).toEqual([]);
    expect(matchIds(await search('T-002', { ...priyaSearch, filters: { minSharedInterests: 3 } }))).toEqual([]);
    const photo = await search('T-002', {
      ...priyaSearch,
      genderPreference: 'ANY',
      interests: ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY'],
      filters: { sharedInterests: ['PHOTOGRAPHY'] },
    });
    expect(matchIds(photo).sort()).toEqual(['G-01', 'G-06']);
  });

  it('rejects bad filters with 400', async () => {
    for (const filters of [{ sharedInterests: ['CASINOS'] }, { minSharedInterests: 1 }, { genderMix: 'ANY' }]) {
      expect((await as('T-002').post('/api/matches/search', { ...priyaSearch, filters })).status).toBe(400);
    }
  });
});

describe('G2 traveller profile with groups', () => {
  it('lists the groups a traveller owns or joined, with roles', async () => {
    const sarah = await anon.get('/api/travellers/T-001');
    expect(sarah.body.data).toMatchObject({ homeCity: expect.any(String), age: 27, interests: expect.any(Array) });
    expect(sarah.body.data.groups).toEqual([
      expect.objectContaining({ id: 'G-01', role: 'OWNER', city: 'Kyoto', memberCount: 1, maxSize: 3, status: 'OPEN' }),
    ]);

    const owner = await signUp({ interests: ['TEMPLES', 'STREET_FOOD'] });
    const member = await signUp();
    const group = await createGroup(owner, { city: 'Osaka' });
    await join(owner, member, group, { city: 'Osaka' });
    const profile = (await anon.get(`/api/travellers/${member}`)).body.data;
    expect(profile.groups).toEqual([expect.objectContaining({ id: group, role: 'MEMBER', memberCount: 2 })]);
    expect((await anon.get(`/api/travellers/${await signUp()}`)).body.data.groups).toEqual([]);
  });
});

describe('S1 group chat', () => {
  let owner: string;
  let member: string;
  let group: string;

  beforeAll(async () => {
    owner = await signUp({ name: 'Chat Owner', interests: ['TEMPLES', 'STREET_FOOD'] });
    member = await signUp({ name: 'Chat Member' });
    group = await createGroup(owner, { city: 'Tokyo' });
    await join(owner, member, group, { city: 'Tokyo' });
  });

  const post = (userId: string, body: unknown) => as(userId).post(`/api/groups/${group}/messages`, { body });
  const list = (userId: string, query = '') => as(userId).get(`/api/groups/${group}/messages${query}`);

  it('is for members only', async () => {
    const outsider = await signUp();
    expect((await post(outsider, 'hi')).status).toBe(403);
    expect((await list(outsider)).status).toBe(403);
    expect((await anon.get(`/api/groups/${group}/messages`)).status).toBe(401);
    expect((await as(owner).get('/api/groups/G-nope/messages')).status).toBe(404);
  });

  it('rejects empty or missing bodies with 400', async () => {
    expect((await post(owner, '')).status).toBe(400);
    expect((await post(owner, '   ')).status).toBe(400);
    expect((await as(owner).post(`/api/groups/${group}/messages`, {})).status).toBe(400);
    expect((await post(owner, 'x'.repeat(1001))).status).toBe(400);
  });

  it('returns messages oldest first with authors, supports `after` polling and limit', async () => {
    const first = await post(owner, 'Hello team');
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ id: expect.any(String), body: 'Hello team', author: { id: owner, name: 'Chat Owner' } });
    await new Promise((r) => setTimeout(r, 5));
    const second = await post(member, '  Gion Corner?  ');
    expect(second.body.data.body).toBe('Gion Corner?');
    await new Promise((r) => setTimeout(r, 5));
    await post(owner, 'Booked!');

    const all = await list(member);
    expect(all.status).toBe(200);
    expect(all.body.data.map((m: { body: string }) => m.body)).toEqual(['Hello team', 'Gion Corner?', 'Booked!']);
    expect(all.body.data[1].author).toEqual({ id: member, name: 'Chat Member' });

    const after = await list(owner, `?after=${encodeURIComponent(first.body.data.createdAt)}`);
    expect(after.body.data.map((m: { body: string }) => m.body)).toEqual(['Gion Corner?', 'Booked!']);
    const last = all.body.data[2].createdAt;
    expect((await list(owner, `?after=${encodeURIComponent(last)}`)).body.data).toEqual([]);

    expect((await list(owner, '?limit=2')).body.data.map((m: { body: string }) => m.body)).toEqual(['Gion Corner?', 'Booked!']);
    expect((await list(owner, '?after=yesterday')).status).toBe(400);
    expect((await list(owner, '?limit=0')).status).toBe(400);
  });

  it('keeps chat in its own group', async () => {
    const other = await createGroup(owner, { city: 'Kyoto' });
    expect((await as(owner).get(`/api/groups/${other}/messages`)).body.data).toEqual([]);
  });
});
