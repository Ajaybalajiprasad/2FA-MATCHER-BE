import { asc, eq } from 'drizzle-orm';
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

  findAllHomeCities() {
    return this.conn.select().from(homeCities).orderBy(asc(homeCities.sortOrder), asc(homeCities.airport));
  }
}

export const catalogRepository = new CatalogRepository();
