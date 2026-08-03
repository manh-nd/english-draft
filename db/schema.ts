import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const errorTypeEnum = pgEnum("error_type", [
  "grammar",
  "vocabulary",
  "style",
]);

export const reviewItemSourceEnum = pgEnum("review_item_source", [
  "correction",
  "vocabulary_item",
]);

// ─── Users ───────────────────────────────────────────────────────────────────
// Compatible with Better Auth's expected schema.

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Folders ─────────────────────────────────────────────────────────────────
// Flat grouping mechanism for Documents.

export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Documents ────────────────────────────────────────────────────────────────
// Stores Tiptap/ProseMirror JSON tree + plain-text extraction for full-text
// search. Supports optional nesting via nullable parent_id.

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    parentId: uuid("parent_id"), // self-reference added below via relations
    title: text("title").notNull().default("Untitled"),
    // Tiptap/ProseMirror document tree stored as JSONB
    content: jsonb("content"),
    // Parallel plain-text extraction for GIN full-text search
    textContent: text("text_content"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // GIN index on text_content for fast full-text search (per ADR-0001)
    index("documents_text_content_gin_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.textContent})`
    ),
    index("documents_user_id_idx").on(table.userId),
    index("documents_folder_id_idx").on(table.folderId),
  ]
);

// ─── Corrections ──────────────────────────────────────────────────────────────
// Every accepted Inline Suggestion is auto-saved here (the Correction Bank).

export const corrections = pgTable("corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  originalText: text("original_text").notNull(),
  correctedText: text("corrected_text").notNull(),
  errorType: errorTypeEnum("error_type").notNull(),
  // Surrounding context captured at correction time
  context: text("context"),
  // Starred entries are prioritised in the Review System
  starred: boolean("starred").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Vocabulary Items ─────────────────────────────────────────────────────────
// Words/phrases explicitly saved for later review.

export const vocabularyItems = pgTable("vocabulary_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  phrase: text("phrase").notNull(),
  definition: text("definition"),
  exampleSentence: text("example_sentence"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Review Items ─────────────────────────────────────────────────────────────
// Union of Corrections + Vocabulary Items scheduled for spaced-repetition
// review. Carries SM-2 SRS metadata.

export const reviewItems = pgTable("review_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: reviewItemSourceEnum("source").notNull(),
  // Exactly one of these will be non-null depending on source
  correctionId: uuid("correction_id").references(() => corrections.id, {
    onDelete: "cascade",
  }),
  vocabularyItemId: uuid("vocabulary_item_id").references(
    () => vocabularyItems.id,
    { onDelete: "cascade" }
  ),
  // SM-2 spaced-repetition scheduling fields
  interval: integer("interval").notNull().default(1), // days until next review
  easeFactor: real("ease_factor").notNull().default(2.5), // SM-2 ease factor
  nextReviewAt: timestamp("next_review_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
