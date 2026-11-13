import { beforeAll, describe, expect, it } from 'vitest';
import { as, createGroup, failedRulesOf, join, matchIds, nearMissIds, resetDb, search, signUp } from './helpers';

beforeAll(resetDb);

type Person = Parameters<typeof signUp>[0];

interface Scenario {
  owner?: Person;
  group?: Record<string, unknown>;
  seeker?: Person;
  search?: Record<string, unknown>;
}

const OWNER_INTERESTS = ['TEMPLES', 'STREET_FOOD', 'PHOTOGRAPHY'];

// Fresh owner + group + seeker, so seeded data never decides the outcome.
const run = async ({ owner, group, seeker, search: s }: Scenario = {}) => {
  const ownerId = await signUp({ name: 'Owner', interests: OWNER_INTERESTS, ...owner });
  const groupId = await createGroup(ownerId, group);
  const seekerId = await signUp({ name: 'Seeker', ...seeker });
  const result = await search(seekerId, { city: (group?.city as string) ?? 'Kyoto', ...s });
  return { ownerId, groupId, seekerId, result, matched: matchIds(result).includes(groupId), failed: failedRulesOf(result, groupId) };
};

const expectMatch = async (scenario: Scenario) => {
  const r = await run(scenario);
  expect(r.failed).toBeUndefined();
  expect(r.matched).toBe(true);
  return r;
};

const expectNearMiss = async (scenario: Scenario, rule: string) => {
  const r = await run(scenario);
  expect(r.matched).toBe(false);
  expect(r.failed).toEqual([rule]);
  return r;
};

describe('budget rule: difference at most 40% of the lower budget', () => {
  it('passes at exactly 40% when the seeker is higher (50,000 vs 70,000)', () =>
    expectMatch({ group: { budgetInr: 50000 }, search: { budgetInr: 70000 } }));
  it('fails at 40% + ₹1 when the seeker is higher (50,000 vs 70,001)', () =>
    expectNearMiss({ group: { budgetInr: 50000 }, search: { budgetInr: 70001 } }, 'BUDGET'));
  it('passes at exactly 40% when the seeker is lower (70,000 vs 50,000)', () =>
    expectMatch({ group: { budgetInr: 70000 }, search: { budgetInr: 50000 } }));
  it('fails just over 40% when the seeker is lower (70,000 vs 49,999)', () =>
    expectNearMiss({ group: { budgetInr: 70000 }, search: { budgetInr: 49999 } }, 'BUDGET'));
  it('matches the problem statement example (60,000 vs 84,000 passes, 85,000 fails)', async () => {
    await expectMatch({ group: { budgetInr: 60000 }, search: { budgetInr: 84000 } });
    await expectNearMiss({ group: { budgetInr: 60000 }, search: { budgetInr: 85000 } }, 'BUDGET');
  });
});

describe('dates rule: at least 2 shared nights (check-out day is not a night)', () => {
  const group = { checkIn: '2027-04-10', checkOut: '2027-04-15' };
  it('passes with exactly 2 shared nights at the end', () =>
    expectMatch({ group, search: { checkIn: '2027-04-13', checkOut: '2027-04-18' } }));
  it('passes with exactly 2 shared nights at the start', () =>
    expectMatch({ group, search: { checkIn: '2027-04-05', checkOut: '2027-04-12' } }));
  it('fails with 1 shared night', async () => {
    const r = await expectNearMiss({ group, search: { checkIn: '2027-04-14', checkOut: '2027-04-18' } }, 'DATES_OVERLAP');
    const rule = (r.result.nearMisses.find((n) => n.groupId === r.groupId)!.rules as { id: string; detail: string }[]).find(
      (x) => x.id === 'DATES_OVERLAP'
    );
    expect(rule?.detail).toBe('1 shared night (2027-04-14 to 2027-04-14), need 2');
  });
  it('fails back-to-back stays with 0 shared nights', () =>
    expectNearMiss({ group, search: { checkIn: '2027-04-15', checkOut: '2027-04-18' } }, 'DATES_OVERLAP'));
  it('passes when the seeker stay is inside the group stay', () =>
    expectMatch({ group, search: { checkIn: '2027-04-11', checkOut: '2027-04-13' } }));
});

describe('interests rule: at least 2 shared with the owner', () => {
  it('passes with exactly 2 shared', () => expectMatch({ search: { interests: ['TEMPLES', 'PHOTOGRAPHY', 'HIKING'] } }));
  it('fails with 1 shared', () => expectNearMiss({ search: { interests: ['TEMPLES', 'HIKING'] } }, 'SHARED_INTERESTS'));
  it('does not count a duplicated interest twice', () =>
    expectNearMiss({ search: { interests: ['TEMPLES', 'TEMPLES'] } }, 'SHARED_INTERESTS'));
  it('compares with the owner profile, not the seeker profile', () =>
    expectMatch({ seeker: { interests: ['NIGHTLIFE'] }, search: { interests: ['TEMPLES', 'STREET_FOOD'] } }));
});

describe('gender rule: both preferences must allow the other', () => {
  it('fails a male ANY seeker against a female SAME_GENDER owner', () =>
    expectNearMiss(
      { owner: { gender: 'FEMALE', genderPreference: 'SAME_GENDER' }, seeker: { gender: 'MALE' }, search: { genderPreference: 'ANY' } },
      'GENDER'
    ));
  it('fails a female SAME_GENDER seeker against a male ANY owner', () =>
    expectNearMiss(
      { owner: { gender: 'MALE', genderPreference: 'ANY' }, seeker: { gender: 'FEMALE' }, search: { genderPreference: 'SAME_GENDER' } },
      'GENDER'
    ));
  it('passes a mixed pair when both are ANY', () =>
    expectMatch({ owner: { gender: 'MALE', genderPreference: 'ANY' }, seeker: { gender: 'FEMALE' }, search: { genderPreference: 'ANY' } }));
  it('passes two men who both want SAME_GENDER', () =>
    expectMatch({
      owner: { gender: 'MALE', genderPreference: 'SAME_GENDER' },
      seeker: { gender: 'MALE' },
      search: { genderPreference: 'SAME_GENDER' },
    }));
  it('uses the seeker profile gender (it cannot be set in the search)', async () => {
    const r = await run({
      owner: { gender: 'FEMALE', genderPreference: 'SAME_GENDER' },
      seeker: { gender: 'MALE', genderPreference: 'ANY' },
      search: { gender: 'FEMALE' },
    });
    expect(r.failed).toEqual(['GENDER']);
  });
});

describe('group size rule and exclusions', () => {
  it('a solo post (maxSize 1) is full and only a near miss', () => expectNearMiss({ group: { maxSize: 1 } }, 'GROUP_SIZE'));

  it('passes with one seat left, then excludes the group once it is full', async () => {
    const { ownerId, groupId } = await expectMatch({ group: { maxSize: 2 } });
    const joiner = await signUp({ name: 'Joiner' });
    await join(ownerId, joiner, groupId);
    const other = await signUp({ name: 'Late' });
    const after = await search(other);
    expect(matchIds(after)).not.toContain(groupId);
    expect(failedRulesOf(after, groupId)).toEqual(['GROUP_SIZE']);
  });

  it('excludes the seeker’s own groups and groups they joined', async () => {
    const { ownerId, groupId, seekerId } = await expectMatch({});
    const own = await search(ownerId);
    expect([...matchIds(own), ...nearMissIds(own)]).not.toContain(groupId);
    await join(ownerId, seekerId, groupId);
    const member = await search(seekerId);
    expect([...matchIds(member), ...nearMissIds(member)]).not.toContain(groupId);
  });

  it('excludes BOOKED groups from matches and near misses', async () => {
    const { ownerId, groupId, seekerId } = await expectMatch({});
    const booked = await as(ownerId).post(`/api/groups/${groupId}/booking`, { roomId: 'RM-KYO-001-A' });
    expect(booked.status).toBe(201);
    const r = await search(seekerId);
    expect([...matchIds(r), ...nearMissIds(r)]).not.toContain(groupId);
  });

  it('drops groups failing two rules entirely', async () => {
    const r = await run({ group: { budgetInr: 50000 }, search: { budgetInr: 90000, interests: ['HIKING', 'TEMPLES'] } });
    expect(r.matched).toBe(false);
    expect(r.failed).toBeUndefined();
  });
});

describe('other cities', () => {
  it.each([
    ['Tokyo', 'Asia/Tokyo'],
    ['Osaka', 'Asia/Tokyo'],
    ['Dubai', 'Asia/Dubai'],
    ['Abu Dhabi', 'Asia/Dubai'],
  ])('matches a new %s group and never shows it in another city', async (city) => {
    const { groupId, seekerId, result } = await expectMatch({ group: { city, checkIn: '2027-04-02', checkOut: '2027-04-06' }, search: { checkIn: '2027-04-03', checkOut: '2027-04-06' } });
    expect([...result.matches, ...result.nearMisses].every((g) => g.city === city)).toBe(true);
    const elsewhere = await search(seekerId, { city: city === 'Kyoto' ? 'Tokyo' : 'Kyoto', checkIn: '2027-04-03', checkOut: '2027-04-06' });
    expect([...matchIds(elsewhere), ...nearMissIds(elsewhere)]).not.toContain(groupId);
  });

  it('only Kyoto groups for a Kyoto search, even when every other rule passes in Osaka', async () => {
    const ownerId = await signUp({ interests: OWNER_INTERESTS });
    const osaka = await createGroup(ownerId, { city: 'Osaka' });
    const r = await search(await signUp(), { city: 'Kyoto' });
    expect([...matchIds(r), ...nearMissIds(r)]).not.toContain(osaka);
  });
});

describe('ranking', () => {
  it('ranks more shared interests first, then breaks ties by shared nights', async () => {
    const all = await signUp({ interests: ['MUSEUMS', 'HISTORY', 'DESERT'] });
    const two = await signUp({ interests: ['MUSEUMS', 'HISTORY'] });
    const g = { city: 'Abu Dhabi', checkIn: '2027-04-02', checkOut: '2027-04-06' };
    const best = await createGroup(all, g);
    const second = await createGroup(two, g);
    const r = await search(await signUp(), { ...g, interests: ['MUSEUMS', 'HISTORY', 'DESERT'] });
    const ids = matchIds(r);
    expect(ids.indexOf(best)).toBeLessThan(ids.indexOf(second));
    expect(ids.indexOf(second)).toBeGreaterThan(-1);
    const scores = r.matches.map((m) => m.score as number);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
