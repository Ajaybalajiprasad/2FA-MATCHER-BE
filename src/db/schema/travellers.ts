import { boolean, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { interests } from './catalog';

export const travellers = pgTable('travellers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age'),
  gender: text('gender').notNull(), // FEMALE | MALE
  homeCity: text('home_city').notNull(),
  homeAirport: text('home_airport'),
  genderPreference: text('gender_preference').notNull(), // ANY | SAME_GENDER
  email: text('email').unique(), // lower-cased login
  passwordHash: text('password_hash'), // scrypt salt:hash
  isSeed: boolean('is_seed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const travellerInterests = pgTable(
  'traveller_interests',
  {
    travellerId: text('traveller_id')
      .notNull()
      .references(() => travellers.id, { onDelete: 'cascade' }),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [primaryKey({ columns: [t.travellerId, t.interestId] })]
);
