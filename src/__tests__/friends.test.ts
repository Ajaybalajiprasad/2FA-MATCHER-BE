import { beforeEach, describe, expect, it } from 'vitest';
import { anon, as, resetDb } from './helpers';

beforeEach(resetDb);
const a = as('T-001');
const b = as('T-002');
const outsider = as('T-003');
const send = async () => {
  const result = await a.post('/api/friends/requests', { travellerId: 'T-002' });
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  return result.body.data.requestId as string;
};

describe('Friends API', () => {
  it.each([undefined, 'T-002', 'T-003', 'T-unknown'])('hides profile group details from non-friend %s, including forged query identity', async (viewer) => {
    const result = await as(viewer).get('/api/travellers/T-001?viewerId=T-001&userId=T-001');
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ name: 'Sarah Thomas', canViewGroups: false, groups: [] });
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(JSON.stringify(result.body.data)).not.toContain('G-01');
  });

  it('shows your own groups without requiring a self friendship', async () => {
    const result = await a.get('/api/travellers/T-001');
    expect(result.body.data.canViewGroups).toBe(true);
    expect(result.body.data.groups.some((group: { id: string }) => group.id === 'G-01')).toBe(true);
  });

  it('keeps groups hidden while pending, permits accepted friends, and revokes visibility after removal', async () => {
    const id = await send();
    const pending = await b.get('/api/travellers/T-001');
    expect(pending.body.data).toMatchObject({ canViewGroups: false, groups: [] });
    await b.post(`/api/friends/requests/${id}/accept`);
    const accepted = await b.get('/api/travellers/T-001');
    expect(accepted.body.data.canViewGroups).toBe(true);
    expect(accepted.body.data.groups.some((group: { id: string }) => group.id === 'G-01')).toBe(true);
    expect((await outsider.get('/api/travellers/T-001')).body.data).toMatchObject({ canViewGroups: false, groups: [] });
    await a.delete('/api/friends/T-002');
    expect((await b.get('/api/travellers/T-001')).body.data).toMatchObject({ canViewGroups: false, groups: [] });
  });

  it('does not expose group summaries in the public traveller directory', async () => {
    const result = await anon.get('/api/travellers');
    for (const person of result.body.data) {
      expect(person).not.toHaveProperty('groups');
      expect(person).not.toHaveProperty('groupCount');
    }
  });

  it('starts with empty lists and distinguishes self, none, incoming and outgoing', async () => {
    expect((await a.get('/api/friends')).body.data).toEqual({ friends: [], incoming: [], outgoing: [] });
    expect((await a.get('/api/friends/relationship/T-001')).body.data.status).toBe('SELF');
    expect((await a.get('/api/friends/relationship/T-002')).body.data.status).toBe('NONE');
    const id = await send();
    expect((await a.get('/api/friends/relationship/T-002')).body.data).toEqual({ status: 'OUTGOING', requestId: id });
    expect((await b.get('/api/friends/relationship/T-001')).body.data).toEqual({ status: 'INCOMING', requestId: id });
    const incoming = (await b.get('/api/friends')).body.data.incoming;
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toMatchObject({ id, traveller: { id: 'T-001', name: 'Sarah Thomas' } });
    expect((await outsider.get('/api/friends')).body.data).toEqual({ friends: [], incoming: [], outgoing: [] });
  });

  it('accepts only for the recipient and persists symmetrically across reads', async () => {
    const id = await send();
    expect((await a.post(`/api/friends/requests/${id}/accept`)).status).toBe(403);
    expect((await outsider.post(`/api/friends/requests/${id}/accept`)).status).toBe(404);
    expect((await b.post(`/api/friends/requests/${id}/accept`)).body.data.status).toBe('FRIENDS');
    for (const [client, other] of [
      [a, 'T-002'],
      [b, 'T-001'],
    ] as const) {
      const lists = (await client.get('/api/friends')).body.data;
      expect(lists.friends).toHaveLength(1);
      expect(lists.friends[0].traveller.id).toBe(other);
      expect(lists.friends[0].acceptedAt).toBeTruthy();
      expect(lists.incoming).toHaveLength(0);
      expect(lists.outgoing).toHaveLength(0);
      expect((await client.get(`/api/friends/relationship/${other}`)).body.data.status).toBe('FRIENDS');
    }
    expect((await b.post(`/api/friends/requests/${id}/accept`)).status).toBe(409);
    expect((await a.delete(`/api/friends/requests/${id}`)).status).toBe(409);
  });

  it.each(['sender', 'recipient'])(
    'allows %s to cancel/decline pending requests, then request again',
    async (actor) => {
      const id = await send();
      const client = actor === 'sender' ? a : b;
      expect((await outsider.delete(`/api/friends/requests/${id}`)).status).toBe(404);
      expect((await client.delete(`/api/friends/requests/${id}`)).status).toBe(200);
      expect((await a.get('/api/friends')).body.data.outgoing).toHaveLength(0);
      expect((await b.get('/api/friends')).body.data.incoming).toHaveLength(0);
      expect((await b.post(`/api/friends/requests/${id}/accept`)).status).toBe(404);
      await send();
    },
  );

  it('prevents duplicate and reverse requests before and after acceptance', async () => {
    const id = await send();
    expect((await a.post('/api/friends/requests', { travellerId: 'T-002' })).status).toBe(409);
    expect((await b.post('/api/friends/requests', { travellerId: 'T-001' })).status).toBe(409);
    expect((await b.post(`/api/friends/requests/${id}/accept`)).status).toBe(200);
    expect((await b.post('/api/friends/requests', { travellerId: 'T-001' })).status).toBe(409);
  });

  it('keeps one row for simultaneous opposite-direction requests', async () => {
    const results = await Promise.all([
      a.post('/api/friends/requests', { travellerId: 'T-002' }),
      b.post('/api/friends/requests', { travellerId: 'T-001' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const lists = (await a.get('/api/friends')).body.data;
    expect(lists.incoming.length + lists.outgoing.length).toBe(1);
  });

  it('handles concurrent acceptance with one winner', async () => {
    const id = await send();
    const results = await Promise.all([
      b.post(`/api/friends/requests/${id}/accept`),
      b.post(`/api/friends/requests/${id}/accept`),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await a.get('/api/friends')).body.data.friends).toHaveLength(1);
  });

  it.each(['sender', 'recipient'])(
    'lets either %s remove a friendship without changing group membership',
    async (actor) => {
      const before = (await a.get('/api/groups/mine')).body.data;
      const id = await send();
      await b.post(`/api/friends/requests/${id}/accept`);
      expect((await outsider.delete('/api/friends/T-001')).status).toBe(404);
      const removed = actor === 'sender' ? await a.delete('/api/friends/T-002') : await b.delete('/api/friends/T-001');
      expect(removed.status).toBe(200);
      expect((await a.get('/api/friends')).body.data.friends).toHaveLength(0);
      expect((await b.get('/api/friends')).body.data.friends).toHaveLength(0);
      expect((await a.get('/api/groups/mine')).body.data).toEqual(before);
      await send();
    },
  );

  it('friendship does not grant access to private group chat or hotels', async () => {
    const id = await send();
    await b.post(`/api/friends/requests/${id}/accept`);
    const profile = await b.get('/api/travellers/T-001');
    expect(profile.status).toBe(200);
    expect(profile.body.data.groups.some((g: { id: string }) => g.id === 'G-01')).toBe(true);
    expect((await b.get('/api/groups/G-01/messages')).status).toBe(403);
    expect((await b.get('/api/groups/G-01/hotels')).status).toBe(403);
  });

  it.each([
    ['self', { travellerId: 'T-001' }, 400],
    ['unknown traveller', { travellerId: 'T-no-such-traveller' }, 404],
    ['missing target', {}, 400],
    ['empty target', { travellerId: '  ' }, 400],
    ['forged requester', { travellerId: 'T-002', requesterId: 'T-003' }, 400],
  ])('rejects %s', async (_label, body, status) => {
    expect((await a.post('/api/friends/requests', body)).status).toBe(status);
  });

  it('does not remove pending requests using the accepted-friend endpoint', async () => {
    await send();
    expect((await a.delete('/api/friends/T-002')).status).toBe(404);
    expect((await b.get('/api/friends')).body.data.incoming).toHaveLength(1);
  });

  it('rejects missing and unknown identities on every friends route', async () => {
    for (const client of [anon, as('T-unknown')]) {
      expect((await client.get('/api/friends')).status).toBe(401);
      expect((await client.get('/api/friends/relationship/T-002')).status).toBe(401);
      expect((await client.post('/api/friends/requests', { travellerId: 'T-002' })).status).toBe(401);
      expect((await client.post('/api/friends/requests/F-unknown/accept')).status).toBe(401);
      expect((await client.delete('/api/friends/requests/F-unknown')).status).toBe(401);
      expect((await client.delete('/api/friends/T-002')).status).toBe(401);
    }
  });
});
