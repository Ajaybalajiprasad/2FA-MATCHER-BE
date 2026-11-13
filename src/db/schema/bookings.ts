import { integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { hotels, rooms } from './catalog';
import { groups } from './groups';
import { travellers } from './travellers';

export const savedOptions = pgTable(
  'saved_options',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    travellerId: text('traveller_id')
      .notNull()
      .references(() => travellers.id),
    hotelId: text('hotel_id')
      .notNull()
      .references(() => hotels.id),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id),
    rooms: integer('rooms').notNull(),
    nights: integer('nights').notNull(),
    totalInr: integer('total_inr').notNull(),
    perMemberInr: integer('per_member_inr').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique('saved_options_group_traveller_room_uq').on(t.groupId, t.travellerId, t.roomId)]
);

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .unique()
    .references(() => groups.id),
  hotelId: text('hotel_id')
    .notNull()
    .references(() => hotels.id),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),
  rooms: integer('rooms').notNull(),
  nights: integer('nights').notNull(),
  members: integer('members').notNull(),
  totalInr: integer('total_inr').notNull(),
  perMemberInr: integer('per_member_inr').notNull(),
  bookedById: text('booked_by_id')
    .notNull()
    .references(() => travellers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
