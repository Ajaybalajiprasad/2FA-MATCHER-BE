import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { groups } from './groups';
import { travellers } from './travellers';

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => travellers.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('messages_group_created_idx').on(t.groupId, t.createdAt, t.id)]
);
