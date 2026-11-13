import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { messages } from '../db/schema';

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export class MessageRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  async insert(message: NewMessage): Promise<Message> {
    const [row] = await this.conn.insert(messages).values(message).returning();
    return row;
  }

  findAfter(groupId: string, after: Date, limit: number): Promise<Message[]> {
    return this.conn
      .select()
      .from(messages)
      .where(and(eq(messages.groupId, groupId), gt(messages.createdAt, after)))
      .orderBy(asc(messages.createdAt), asc(messages.id))
      .limit(limit);
  }

  async findLatest(groupId: string, limit: number): Promise<Message[]> {
    const rows = await this.conn
      .select()
      .from(messages)
      .where(eq(messages.groupId, groupId))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit);
    return rows.reverse();
  }
}

export const messageRepository = new MessageRepository();
