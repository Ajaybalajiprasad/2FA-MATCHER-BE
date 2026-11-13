import { and, desc, eq, or } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { friendships } from '../db/schema';

export type Friendship = typeof friendships.$inferSelect;

export class FriendRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  list(travellerId: string): Promise<Friendship[]> {
    return this.conn
      .select()
      .from(friendships)
      .where(or(eq(friendships.travellerAId, travellerId), eq(friendships.travellerBId, travellerId)))
      .orderBy(desc(friendships.createdAt), desc(friendships.id));
  }

  async findPair(first: string, second: string): Promise<Friendship | undefined> {
    const [a, b] = [first, second].sort();
    const [row] = await this.conn
      .select()
      .from(friendships)
      .where(and(eq(friendships.travellerAId, a), eq(friendships.travellerBId, b)))
      .limit(1);
    return row;
  }

  async findById(id: string): Promise<Friendship | undefined> {
    const [row] = await this.conn.select().from(friendships).where(eq(friendships.id, id)).limit(1);
    return row;
  }

  async request(requesterId: string, targetId: string, id: string): Promise<Friendship | undefined> {
    const [travellerAId, travellerBId] = [requesterId, targetId].sort();
    const [row] = await this.conn
      .insert(friendships)
      .values({ id, travellerAId, travellerBId, requesterId })
      .onConflictDoNothing({ target: [friendships.travellerAId, friendships.travellerBId] })
      .returning();
    return row;
  }

  async accept(id: string): Promise<Friendship | undefined> {
    const [row] = await this.conn
      .update(friendships)
      .set({ status: 'ACCEPTED', acceptedAt: new Date() })
      .where(and(eq(friendships.id, id), eq(friendships.status, 'PENDING')))
      .returning();
    return row;
  }

  async remove(id: string, status: Friendship['status']): Promise<boolean> {
    const rows = await this.conn
      .delete(friendships)
      .where(and(eq(friendships.id, id), eq(friendships.status, status)))
      .returning({ id: friendships.id });
    return rows.length > 0;
  }
}

export const friendRepository = new FriendRepository();
