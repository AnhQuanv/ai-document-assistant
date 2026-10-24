import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),

  title: varchar('title', { length: 255 }).notNull(),

  status: varchar('status', { length: 255 }).notNull().default('uploaded'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  originalFileName: varchar('original_file_name', { length: 255 }),
  storageKey: varchar('storage_key', {
    length: 255,
  }).unique(),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: integer('file_size'),
});
