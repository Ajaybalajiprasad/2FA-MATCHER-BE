import { beforeEach, describe, expect, it } from 'vitest';
import { anon, as, createGroup, decide, join, requestJoin, resetDb, search, searchAndRequest, signUp } from './helpers';

let owner: string;
let groupId: string;

beforeEach(async () => {
  await resetDb();
  owner = await signUp({ name: 'Owen Owner', interests: ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY'] });
  groupId = await createGroup(owner, { maxSize: 3 });
});

describe('M5 join requests', () => {
  it('creates a PENDING request from the seeker’s own search', async () => {
    const seeker = await signUp({ name: 'Sam Seeker' });
    const { searchId } = await search(seeker);
    const res = await requestJoin(seeker, groupId, searchId);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: expect.stringMatching(/^R-/), groupId, seekerId: seeker, searchId, status: 'PENDING' });

    const mine = await as(seeker).get('/api/requests/mine');
    expect(mine.body.data).toEqual([expect.objectContaining({ groupId, status: 'PENDING', group: expect.objectContaining({ city: 'Kyoto' }) })]);

    const again = await search(seeker);
    expect(again.matches.find((m) => m.groupId === groupId)?.myRequestStatus).toBe('PENDING');
    expect((await as(seeker).get(`/api/groups/${groupId}`)).body.data.myRequestStatus).toBe('PENDING');
  });

  it('rejects a duplicate request with 409', async () => {
    const seeker = await signUp();
    const { searchId } = await search(seeker);
    expect((await requestJoin(seeker, groupId, searchId)).status).toBe(201);
    const dup = await requestJoin(seeker, groupId, searchId);
    expect(dup.status).toBe(409);
    expect(dup.body.error.details).toMatchObject({ status: 'PENDING' });
  });

  it('rejects someone else’s searchId with 403 and an unknown one with 404', async () => {
    const a = await signUp();
    const b = await signUp();
    const { searchId } = await search(a);
    const res = await requestJoin(b, groupId, searchId);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await requestJoin(b, groupId, 'S-unknown')).status).toBe(404);
  });

  it('re-checks all rules on the server: a non-matching group returns 422 RULE_NOT_MET', async () => {
    const seeker = await signUp({ gender: 'MALE' });
    const ownerOnlyWomen = await signUp({ gender: 'FEMALE', genderPreference: 'SAME_GENDER', interests: ['TEMPLES', 'STREET_FOOD'] });
    const womenGroup = await createGroup(ownerOnlyWomen);
    const { searchId } = await search(seeker);
    const res = await requestJoin(seeker, womenGroup, searchId);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('RULE_NOT_MET');
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ id: 'GENDER', pass: false }));

    const otherCity = await search(seeker, { city: 'Tokyo' });
    const cityRes = await requestJoin(seeker, groupId, otherCity.searchId);
    expect(cityRes.status).toBe(422);
    expect(cityRes.body.error.details).toContainEqual(expect.objectContaining({ id: 'SAME_CITY', pass: false }));
  });

  it('rejects requests to unknown groups (404) and without a user (401)', async () => {
    const seeker = await signUp();
    const { searchId } = await search(seeker);
    expect((await requestJoin(seeker, 'G-nope', searchId)).status).toBe(404);
    expect((await anon.post(`/api/groups/${groupId}/requests`, { searchId })).status).toBe(401);
    expect((await as(seeker).post(`/api/groups/${groupId}/requests`, {})).status).toBe(400);
  });

  it('lets only the owner list requests, with seeker details and rule results', async () => {
    const seeker = await signUp({ name: 'Listed Lee' });
    await searchAndRequest(seeker, groupId);
    const res = await as(owner).get(`/api/groups/${groupId}/requests`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        seekerId: seeker,
        status: 'PENDING',
        seeker: expect.objectContaining({ name: 'Listed Lee' }),
        criteria: expect.objectContaining({ checkIn: '2027-04-10', budgetInr: 60000 }),
        rules: expect.arrayContaining([expect.objectContaining({ id: 'GROUP_SIZE', pass: true })]),
      }),
    ]);
    expect((await as(seeker).get(`/api/groups/${groupId}/requests`)).status).toBe(403);

    const mine = await as(owner).get('/api/groups/mine');
    expect(mine.body.data.find((g: { id: string }) => g.id === groupId).pendingRequestCount).toBe(1);
    expect((await as(owner).get(`/api/groups/${groupId}`)).body.data.pendingRequestCount).toBe(1);
    expect((await as(seeker).get(`/api/groups/${groupId}`)).body.data.pendingRequestCount).toBeNull();
  });

  it('approves: adds the member, updates counts, and blocks a second decision', async () => {
    const seeker = await signUp({ name: 'Approved Ann' });
    const requestId = await searchAndRequest(seeker, groupId);
    const res = await decide(owner, requestId, 'APPROVE');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: requestId, status: 'APPROVED', memberCount: 2, seatsLeft: 1 });

    const group = (await anon.get(`/api/groups/${groupId}`)).body.data;
    expect(group.members.map((m: { id: string }) => m.id).sort()).toEqual([owner, seeker].sort());
    expect(group).toMatchObject({ memberCount: 2, seatsLeft: 1 });
    expect((await as(seeker).get('/api/groups/mine')).body.data).toContainEqual(expect.objectContaining({ id: groupId, role: 'MEMBER' }));
    expect((await as(owner).get('/api/groups/mine')).body.data[0].pendingRequestCount).toBe(0);

    expect((await decide(owner, requestId, 'APPROVE')).status).toBe(409);
    expect((await decide(owner, requestId, 'REJECT')).status).toBe(409);

    const approved = await as(owner).get(`/api/groups/${groupId}/requests?status=APPROVED`);
    expect(approved.body.data.map((r: { id: string }) => r.id)).toEqual([requestId]);
  });

  it('rejects: no member added, and the seeker cannot request again', async () => {
    const seeker = await signUp();
    const requestId = await searchAndRequest(seeker, groupId);
    const res = await decide(owner, requestId, 'REJECT');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'REJECTED', memberCount: 1 });
    expect((await anon.get(`/api/groups/${groupId}`)).body.data.memberCount).toBe(1);
    expect((await as(seeker).get('/api/requests/mine')).body.data[0].status).toBe('REJECTED');
    const { searchId } = await search(seeker);
    expect((await requestJoin(seeker, groupId, searchId)).status).toBe(409);
  });

  it('only the owner can decide, and bad actions are rejected', async () => {
    const seeker = await signUp();
    const requestId = await searchAndRequest(seeker, groupId);
    expect((await decide(seeker, requestId, 'APPROVE')).status).toBe(403);
    expect((await as(owner).patch(`/api/requests/${requestId}`, { action: 'MAYBE' })).status).toBe(400);
    expect((await decide(owner, 'R-nope', 'APPROVE')).status).toBe(404);
  });

  it('refuses to approve once the group became full (409 Group is full)', async () => {
    const small = await createGroup(owner, { maxSize: 2 });
    const first = await signUp();
    const second = await signUp();
    const r1 = await searchAndRequest(first, small);
    const r2 = await searchAndRequest(second, small);
    expect((await decide(owner, r1, 'APPROVE')).status).toBe(200);
    const res = await decide(owner, r2, 'APPROVE');
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Group is full');
    expect((await anon.get(`/api/groups/${small}`)).body.data.memberCount).toBe(2);
    expect((await as(owner).get(`/api/groups/${small}/requests`)).body.data.map((r: { id: string }) => r.id)).toEqual([r2]);
  });

  it('a member cannot request the same group again (409)', async () => {
    const seeker = await signUp();
    await join(owner, seeker, groupId);
    const { searchId } = await search(seeker, { checkIn: '2027-04-10', checkOut: '2027-04-15' });
    const res = await requestJoin(seeker, groupId, searchId);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already a member');
  });

  it('the owner cannot request their own group (409)', async () => {
    const { searchId } = await search(owner);
    expect((await requestJoin(owner, groupId, searchId)).status).toBe(409);
  });

  it('two parallel approvals for the last seat: exactly one succeeds', async () => {
    const small = await createGroup(owner, { maxSize: 2 });
    const r1 = await searchAndRequest(await signUp(), small);
    const r2 = await searchAndRequest(await signUp(), small);
    const results = await Promise.all([decide(owner, r1, 'APPROVE'), decide(owner, r2, 'APPROVE')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await anon.get(`/api/groups/${small}`)).body.data).toMatchObject({ memberCount: 2, seatsLeft: 0 });
  });

  it('requests to a BOOKED group return 409', async () => {
    const seeker = await signUp();
    const { searchId } = await search(seeker);
    expect((await as(owner).post(`/api/groups/${groupId}/booking`, { roomId: 'RM-KYO-001-A' })).status).toBe(201);
    const res = await requestJoin(seeker, groupId, searchId);
    expect(res.status).toBe(409);
  });

  it('approving a pending request after the group was booked returns 409', async () => {
    const seeker = await signUp();
    const requestId = await searchAndRequest(seeker, groupId);
    expect((await as(owner).post(`/api/groups/${groupId}/booking`, { roomId: 'RM-KYO-001-A' })).status).toBe(201);
    expect((await decide(owner, requestId, 'APPROVE')).status).toBe(409);
  });
});
