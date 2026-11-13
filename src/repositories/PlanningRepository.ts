import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../db';
import { bookings, groups, hotels, rooms, savedOptions } from '../db/schema';

export type NewSavedOption = typeof savedOptions.$inferInsert;
export type NewBooking = typeof bookings.$inferInsert;

export class PlanningRepository {
  constructor(private readonly conn: DbOrTx = db) {}

  async findRoomsWithHotel(roomIds: string[]) {
    if (roomIds.length === 0) return [];
    return this.conn
      .select({ room: rooms, hotel: hotels })
      .from(rooms)
      .innerJoin(hotels, eq(hotels.id, rooms.hotelId))
      .where(inArray(rooms.id, roomIds))
      .orderBy(asc(rooms.id));
  }

  async insertSaved(option: NewSavedOption): Promise<boolean> {
    const rows = await this.conn.insert(savedOptions).values(option).onConflictDoNothing().returning({ id: savedOptions.id });
    return rows.length > 0;
  }

  async deleteSaved(groupId: string, travellerId: string, roomId: string): Promise<boolean> {
    const rows = await this.conn
      .delete(savedOptions)
      .where(
        and(eq(savedOptions.groupId, groupId), eq(savedOptions.travellerId, travellerId), eq(savedOptions.roomId, roomId))
      )
      .returning({ id: savedOptions.id });
    return rows.length > 0;
  }

  findSavedByGroup(groupId: string) {
    return this.conn
      .select()
      .from(savedOptions)
      .where(eq(savedOptions.groupId, groupId))
      .orderBy(asc(savedOptions.roomId), asc(savedOptions.createdAt), asc(savedOptions.id));
  }

  async insertBooking(booking: NewBooking): Promise<boolean> {
    const rows = await this.conn.insert(bookings).values(booking).onConflictDoNothing().returning({ id: bookings.id });
    return rows.length > 0;
  }

  async setGroupStatus(groupId: string, status: 'OPEN' | 'BOOKED'): Promise<void> {
    await this.conn.update(groups).set({ status }).where(eq(groups.id, groupId));
  }

  async findBookingByGroup(groupId: string) {
    const [row] = await this.conn.select().from(bookings).where(eq(bookings.groupId, groupId)).limit(1);
    return row;
  }
}

export const planningRepository = new PlanningRepository();
