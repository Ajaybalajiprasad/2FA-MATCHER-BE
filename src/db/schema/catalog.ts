// sortOrder keeps the data pack order so lists are deterministic on any database.
import { boolean, doublePrecision, integer, json, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

export const interests = pgTable('interests', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  category: text('category').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const cities = pgTable('cities', {
  name: text('name').primaryKey(),
  country: text('country').notNull(),
  countryCode: text('country_code').notNull(),
  timezone: text('timezone').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const homeCities = pgTable('home_cities', {
  airport: text('airport').primaryKey(),
  city: text('city').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const hotels = pgTable('hotels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  aliases: json('aliases').$type<string[]>().notNull(),
  city: text('city')
    .notNull()
    .references(() => cities.name),
  area: text('area').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  rating: doublePrecision('rating').notNull(),
  stars: integer('stars').notNull(),
  checkInFrom: text('check_in_from').notNull(),
  checkOutUntil: text('check_out_until').notNull(),
  familyFriendly: boolean('family_friendly').notNull(),
  image: text('image').notNull(),
});

export const rooms = pgTable('rooms', {
  id: text('id').primaryKey(),
  hotelId: text('hotel_id')
    .notNull()
    .references(() => hotels.id),
  roomType: text('room_type').notNull(),
  name: text('name').notNull(),
  maxAdults: integer('max_adults').notNull(),
  maxChildren: integer('max_children').notNull(),
  pricePerNightInr: integer('price_per_night_inr').notNull(),
  currency: text('currency').notNull(),
  refundable: boolean('refundable').notNull(),
});

export const roomAvailability = pgTable(
  'room_availability',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id),
    date: text('date').notNull(),
    roomsLeft: integer('rooms_left').notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.date] })]
);
