import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { travellers } from './travellers';

// Store each pair once, in ID order, so opposite-direction requests cannot duplicate it.
export const friendships = pgTable(
  'friendships',
  {
    id: text('id').primaryKey(),
    travellerAId: text('traveller_a_id')
      .notNull()
      .references(() => travellers.id, { onDelete: 'cascade' }),
    travellerBId: text('traveller_b_id')
      .notNull()
      .references(() => travellers.id, { onDelete: 'cascade' }),
    requesterId: text('requester_id')
      .notNull()
      .references(() => travellers.id, { onDelete: 'cascade' }),
    status: text('status').$type<'PENDING' | 'ACCEPTED'>().notNull().default('PENDING'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at'),
  },
  (t) => [
    unique('friendships_pair_unique').on(t.travellerAId, t.travellerBId),
    index('friendships_a_idx').on(t.travellerAId),
    index('friendships_b_idx').on(t.travellerBId),
    check('friendships_ordered_pair', sql`${t.travellerAId} < ${t.travellerBId}`),
    check('friendships_requester_in_pair', sql`${t.requesterId} IN (${t.travellerAId}, ${t.travellerBId})`),
    check('friendships_status', sql`${t.status} IN ('PENDING', 'ACCEPTED')`),
  ],
);
