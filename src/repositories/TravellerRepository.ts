import { asc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { travellerInterests, travellers } from '../db/schema';
import type { Traveller } from '../types/traveller.types';

type TravellerRow = typeof travellers.$inferSelect;

const toTraveller = (row: TravellerRow, interests: string[]): Traveller => ({
  id: row.id,
  name: row.name,
  age: row.age,
  gender: row.gender as Traveller['gender'],
  homeCity: row.homeCity,
  homeAirport: row.homeAirport,
  genderPreference: row.genderPreference as Traveller['genderPreference'],
  interests,
});

export class TravellerRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  private async interestsByTraveller(ids: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (ids.length === 0) return map;
    const rows = await this.conn
      .select()
      .from(travellerInterests)
      .where(inArray(travellerInterests.travellerId, ids))
      .orderBy(asc(travellerInterests.travellerId), asc(travellerInterests.sortOrder));
    for (const row of rows) map.set(row.travellerId, [...(map.get(row.travellerId) ?? []), row.interestId]);
    return map;
  }

  async findById(id: string): Promise<Traveller | undefined> {
    const [row] = await this.conn.select().from(travellers).where(eq(travellers.id, id)).limit(1);
    if (!row) return undefined;
    const interests = await this.interestsByTraveller([id]);
    return toTraveller(row, interests.get(id) ?? []);
  }

  async findByIds(ids: string[]): Promise<Traveller[]> {
    if (ids.length === 0) return [];
    const rows = await this.conn.select().from(travellers).where(inArray(travellers.id, ids)).orderBy(asc(travellers.id));
    const interests = await this.interestsByTraveller(rows.map((r) => r.id));
    return rows.map((r) => toTraveller(r, interests.get(r.id) ?? []));
  }

  async findAll(): Promise<Traveller[]> {
    const rows = await this.conn.select().from(travellers).orderBy(asc(travellers.createdAt), asc(travellers.id));
    const interests = await this.interestsByTraveller(rows.map((r) => r.id));
    return rows.map((r) => toTraveller(r, interests.get(r.id) ?? []));
  }

  async findSeeded(): Promise<{ id: string; name: string; homeCity: string }[]> {
    return this.conn
      .select({ id: travellers.id, name: travellers.name, homeCity: travellers.homeCity })
      .from(travellers)
      .where(eq(travellers.isSeed, true))
      .orderBy(asc(travellers.id));
  }

  async findCredentialsByEmail(email: string): Promise<{ id: string; passwordHash: string | null } | undefined> {
    const [row] = await this.conn
      .select({ id: travellers.id, passwordHash: travellers.passwordHash })
      .from(travellers)
      .where(eq(travellers.email, email))
      .limit(1);
    return row;
  }

  async create(traveller: Traveller, credentials: { email: string; passwordHash: string }): Promise<void> {
    const { interests, ...profile } = traveller;
    await this.conn.insert(travellers).values({ ...profile, ...credentials });
    await this.conn
      .insert(travellerInterests)
      .values(interests.map((interestId, sortOrder) => ({ travellerId: traveller.id, interestId, sortOrder })));
  }
}

export const travellerRepository = new TravellerRepository();
