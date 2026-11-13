import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { groupMembers, groups, joinRequests } from '../db/schema';

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export class GroupRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  async create(group: NewGroup): Promise<void> {
    await this.conn.insert(groups).values(group);
  }

  async addMember(groupId: string, travellerId: string): Promise<void> {
    await this.conn.insert(groupMembers).values({ groupId, travellerId });
  }

  async findById(id: string): Promise<Group | undefined> {
    const [row] = await this.conn.select().from(groups).where(eq(groups.id, id)).limit(1);
    return row;
  }

  async findByIdForUpdate(id: string): Promise<Group | undefined> {
    const [row] = await this.conn.select().from(groups).where(eq(groups.id, id)).limit(1).for('update');
    return row;
  }

  findOpen(): Promise<Group[]> {
    return this.conn.select().from(groups).where(eq(groups.status, 'OPEN')).orderBy(asc(groups.id));
  }

  findByMember(travellerId: string): Promise<Group[]> {
    return this.conn
      .select({ group: groups })
      .from(groups)
      .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.travellerId, travellerId))
      .orderBy(asc(groups.checkIn), asc(groups.id))
      .then((rows) => rows.map((r) => r.group));
  }

  async findMemberIds(groupId: string): Promise<string[]> {
    const rows = await this.conn
      .select({ travellerId: groupMembers.travellerId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(asc(groupMembers.joinedAt), asc(groupMembers.travellerId));
    return rows.map((r) => r.travellerId);
  }

  async memberCounts(groupIds: string[]): Promise<Map<string, number>> {
    if (groupIds.length === 0) return new Map();
    const rows = await this.conn
      .select({ groupId: groupMembers.groupId, n: count() })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, groupIds))
      .groupBy(groupMembers.groupId);
    return new Map(rows.map((r) => [r.groupId, r.n]));
  }

  async pendingRequestCounts(groupIds: string[]): Promise<Map<string, number>> {
    if (groupIds.length === 0) return new Map();
    const rows = await this.conn
      .select({ groupId: joinRequests.groupId, n: count() })
      .from(joinRequests)
      .where(and(inArray(joinRequests.groupId, groupIds), eq(joinRequests.status, 'PENDING')))
      .groupBy(joinRequests.groupId);
    return new Map(rows.map((r) => [r.groupId, r.n]));
  }

  async requestStatusesForSeeker(seekerId: string, groupIds?: string[]): Promise<Map<string, string>> {
    const where = groupIds
      ? and(eq(joinRequests.seekerId, seekerId), inArray(joinRequests.groupId, groupIds))
      : eq(joinRequests.seekerId, seekerId);
    const rows = await this.conn
      .select({ groupId: joinRequests.groupId, status: joinRequests.status })
      .from(joinRequests)
      .where(where)
      .orderBy(asc(joinRequests.groupId), asc(joinRequests.id));
    return new Map(rows.map((r) => [r.groupId, r.status]));
  }
}

export const groupRepository = new GroupRepository();
