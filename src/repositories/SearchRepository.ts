import { asc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { searches } from '../db/schema';

export type Search = typeof searches.$inferSelect;
export type NewSearch = typeof searches.$inferInsert;

export class SearchRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  async create(search: NewSearch): Promise<void> {
    await this.conn.insert(searches).values(search);
  }

  async findById(id: string): Promise<Search | undefined> {
    const [row] = await this.conn.select().from(searches).where(eq(searches.id, id)).limit(1);
    return row;
  }

  findByIds(ids: string[]): Promise<Search[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.conn.select().from(searches).where(inArray(searches.id, ids)).orderBy(asc(searches.id));
  }
}

export const searchRepository = new SearchRepository();
