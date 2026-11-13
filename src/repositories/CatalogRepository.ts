import { asc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { cities, homeCities, interests } from '../db/schema';

export class CatalogRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  findAllCities() {
    return this.conn.select().from(cities).orderBy(asc(cities.sortOrder), asc(cities.name));
  }

  async findCity(name: string) {
    const [row] = await this.conn.select().from(cities).where(eq(cities.name, name)).limit(1);
    return row;
  }

  findAllInterests() {
    return this.conn.select().from(interests).orderBy(asc(interests.sortOrder), asc(interests.id));
  }

  async findUnknownInterests(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.conn.select({ id: interests.id }).from(interests).where(inArray(interests.id, ids));
    const known = new Set(rows.map((r) => r.id));
    return ids.filter((id) => !known.has(id));
  }

  findAllHomeCities() {
    return this.conn.select().from(homeCities).orderBy(asc(homeCities.sortOrder), asc(homeCities.airport));
  }
}

export const catalogRepository = new CatalogRepository();
