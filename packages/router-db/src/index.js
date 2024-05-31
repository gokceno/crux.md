import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { randomBytes } from 'node:crypto';

export const buckets = sqliteTable('buckets', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  source: text('source').notNull(),
  cache: text('cache').notNull(),
  accessKey: text('access_key').notNull().$defaultFn(() => randomBytes(64).toString('base64url')),
  secretKey: text('secret_key').notNull().$defaultFn(() => randomBytes(64).toString('base64url')),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});