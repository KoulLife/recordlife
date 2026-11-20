import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('title_length', sql`char_length(${t.title}) between 1 and 100`),
    check('ended_after_started', sql`${t.endedAt} is null or ${t.endedAt} > ${t.startedAt}`),
    // At most one running activity.
    uniqueIndex('one_running').on(sql`(true)`).where(sql`${t.endedAt} is null`),
    index('activities_started_at').on(t.startedAt),
  ],
);

export type ActivityRow = typeof activities.$inferSelect;
