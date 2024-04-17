import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export const buckets = sqliteTable('buckets', {
  id: text('id').notNull().$defaultFn(() => createId()),
  source: text('source').notNull(),
  cache: text('cache').notNull(),
  accessKey: text('access_key').notNull(),
  secretKey: text('secret_key').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});