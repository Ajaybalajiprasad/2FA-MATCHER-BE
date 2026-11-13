import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { hotels, roomAvailability, rooms } from '../db/schema';

export class HotelRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  findHotelsByCity(city: string) {
    return this.conn.select().from(hotels).where(eq(hotels.city, city)).orderBy(asc(hotels.id));
  }

  async findRoomsByHotelIds(hotelIds: string[]) {
    if (hotelIds.length === 0) return [];
    return this.conn
      .select()
      .from(rooms)
      .where(inArray(rooms.hotelId, hotelIds))
      .orderBy(asc(rooms.hotelId), asc(rooms.id));
  }

  async findAvailability(roomIds: string[], dates: string[]) {
    if (roomIds.length === 0 || dates.length === 0) return [];
    return this.conn
      .select()
      .from(roomAvailability)
      .where(and(inArray(roomAvailability.roomId, roomIds), inArray(roomAvailability.date, dates)))
      .orderBy(asc(roomAvailability.roomId), asc(roomAvailability.date));
  }
}

export const hotelRepository = new HotelRepository();
