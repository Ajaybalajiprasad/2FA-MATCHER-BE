import { and, asc, desc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { groups, joinRequests } from '../db/schema';

export type JoinRequest = typeof joinRequests.$inferSelect;
export type NewJoinRequest = typeof joinRequests.$inferInsert;
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export class JoinRequestRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  async create(request: NewJoinRequest): Promise<JoinRequest | undefined> {
    const [row] = await this.conn.insert(joinRequests).values(request).onConflictDoNothing().returning();
    return row;
  }

  async findById(id: string): Promise<JoinRequest | undefined> {
    const [row] = await this.conn.select().from(joinRequests).where(eq(joinRequests.id, id)).limit(1);
    return row;
  }

  async findByGroupAndSeeker(groupId: string, seekerId: string): Promise<JoinRequest | undefined> {
    const [row] = await this.conn
      .select()
      .from(joinRequests)
      .where(and(eq(joinRequests.groupId, groupId), eq(joinRequests.seekerId, seekerId)))
      .limit(1);
    return row;
  }

  findByGroup(groupId: string, status?: JoinRequestStatus): Promise<JoinRequest[]> {
    const where = status
      ? and(eq(joinRequests.groupId, groupId), eq(joinRequests.status, status))
      : eq(joinRequests.groupId, groupId);
    return this.conn.select().from(joinRequests).where(where).orderBy(asc(joinRequests.createdAt), asc(joinRequests.id));
  }

  findBySeekerWithGroup(seekerId: string) {
    return this.conn
      .select({
        request: joinRequests,
        group: { name: groups.name, city: groups.city, checkIn: groups.checkIn, checkOut: groups.checkOut, status: groups.status },
      })
      .from(joinRequests)
      .innerJoin(groups, eq(groups.id, joinRequests.groupId))
      .where(eq(joinRequests.seekerId, seekerId))
      .orderBy(desc(joinRequests.createdAt), asc(joinRequests.id));
  }

  // Only flips PENDING rows so concurrent decisions cannot overwrite each other.
  async decide(id: string, status: Exclude<JoinRequestStatus, 'PENDING'>): Promise<JoinRequest | undefined> {
    const [row] = await this.conn
      .update(joinRequests)
      .set({ status, decidedAt: new Date() })
      .where(and(eq(joinRequests.id, id), eq(joinRequests.status, 'PENDING')))
      .returning();
    return row;
  }
}

export const joinRequestRepository = new JoinRequestRepository();
