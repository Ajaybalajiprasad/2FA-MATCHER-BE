import { integer, json, pgTable, primaryKey, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { cities } from './catalog';
import { travellers } from './travellers';

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => travellers.id),
  city: text('city')
    .notNull()
    .references(() => cities.name),
  checkIn: text('check_in').notNull(),
  checkOut: text('check_out').notNull(),
  maxSize: integer('max_size').notNull(), // owner included
  budgetInr: integer('budget_inr').notNull(), // per person
  itinerary: text('itinerary').notNull(),
  genderPreference: text('gender_preference').notNull().default('ANY'), // ANY | SAME_GENDER, per trip
  status: text('status').notNull().default('OPEN'), // OPEN | BOOKED
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    travellerId: text('traveller_id')
      .notNull()
      .references(() => travellers.id),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.travellerId] })]
);

export const searches = pgTable('searches', {
  id: text('id').primaryKey(),
  seekerId: text('seeker_id')
    .notNull()
    .references(() => travellers.id),
  homeCity: text('home_city'),
  city: text('city').notNull(),
  checkIn: text('check_in').notNull(),
  checkOut: text('check_out').notNull(),
  budgetInr: integer('budget_inr').notNull(),
  interests: json('interests').$type<string[]>().notNull(),
  gender: text('gender').notNull(),
  genderPreference: text('gender_preference').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const joinRequests = pgTable(
  'join_requests',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    seekerId: text('seeker_id')
      .notNull()
      .references(() => travellers.id),
    searchId: text('search_id').references(() => searches.id),
    status: text('status').notNull().default('PENDING'), // PENDING | APPROVED | REJECTED
    createdAt: timestamp('created_at').notNull().defaultNow(),
    decidedAt: timestamp('decided_at'),
  },
  (t) => [unique('join_requests_group_seeker_uq').on(t.groupId, t.seekerId)]
);
