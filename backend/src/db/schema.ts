import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
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

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  tokenHash: text('token_hash').notNull().unique(),

  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).notNull(),

  revokedAt: timestamp('revoked_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
