import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    role: varchar('role', { length: 10 }).notNull().default('user'),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    nativeLanguage: varchar('native_language', { length: 2 }).notNull().default('en'),
    dailyCaptureLimit: integer('daily_capture_limit').notNull().default(10),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('users_email_idx').on(table.email)],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    generation: integer('generation').notNull().default(0),
    prevUsableUntil: timestamp('prev_usable_until'),
    lastRotatedAt: timestamp('last_rotated_at').notNull().defaultNow(),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('idx_user_sessions_user_id').on(table.userId)],
);

export const oneTimeTokens = pgTable(
  'one_time_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    purpose: varchar('purpose', { length: 32 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_one_time_tokens_user_id').on(table.userId),
    index('idx_one_time_tokens_hash_purpose_expires_used').on(
      table.tokenHash,
      table.purpose,
      table.expiresAt,
      table.usedAt,
    ),
    index('idx_one_time_tokens_expires_at').on(table.expiresAt),
  ],
);

export const books = pgTable(
  'books',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    author: varchar('author', { length: 255 }),
    language: varchar('language', { length: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_books_user_id').on(table.userId)],
);

export const captures = pgTable(
  'captures',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    imageKey: text('image_key').notNull(),
    targetLanguage: varchar('target_language', { length: 2 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    aiResult: jsonb('ai_result'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_captures_user_created_at').on(table.userId, table.createdAt),
    index('idx_captures_book_status').on(table.bookId, table.status),
  ],
);

export const words = pgTable(
  'words',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lemma: varchar('lemma', { length: 255 }).notNull(),
    lemmaKey: varchar('lemma_key', { length: 255 }).notNull(),
    sourceLanguage: varchar('source_language', { length: 2 }).notNull(),
    targetLanguage: varchar('target_language', { length: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('words_user_languages_lemma_key').on(
      table.userId,
      table.sourceLanguage,
      table.targetLanguage,
      table.lemmaKey,
    ),
  ],
);

export const wordOccurrences = pgTable(
  'word_occurrences',
  {
    id: uuid('id').primaryKey(),
    wordId: uuid('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => captures.id, { onDelete: 'cascade' }),
    surfaceForm: varchar('surface_form', { length: 255 }).notNull(),
    sentence: text('sentence').notNull(),
    sentenceKey: text('sentence_key').notNull(),
    translation: text('translation').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_word_occurrences_word_id').on(table.wordId),
    index('idx_word_occurrences_book_id').on(table.bookId),
    index('idx_word_occurrences_capture_id').on(table.captureId),
  ],
);
