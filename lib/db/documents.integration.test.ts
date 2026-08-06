import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import type { DocumentListItem } from "@/lib/db/documents";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  (process.env.RUN_SEARCH_DB_TESTS === "1"
    ? process.env.DATABASE_URL
    : undefined);
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("Document full-text search (PostgreSQL)", () => {
  const ownerId = `search-owner-${randomUUID()}`;
  const otherUserId = `search-other-${randomUUID()}`;
  const uniqueTerm = `sprinting${randomUUID().replaceAll("-", "")}`;
  const ownerEmail = `${ownerId}@example.test`;
  const otherEmail = `${otherUserId}@example.test`;
  let database: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let searchDocuments: (
    userId: string,
    query: string
  ) => Promise<DocumentListItem[]>;
  let ownerDocumentId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    [{ db: database }, schema, { searchDocuments }] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("@/lib/db/documents"),
    ]);

    await database.insert(schema.users).values([
      { id: ownerId, name: "Search owner", email: ownerEmail },
      { id: otherUserId, name: "Search other", email: otherEmail },
    ]);

    const [ownerDocument] = await database
      .insert(schema.documents)
      .values({
        userId: ownerId,
        title: "Title without the search term",
        textContent: `The learner is running quickly beside ${uniqueTerm}.`,
      })
      .returning({ id: schema.documents.id });
    ownerDocumentId = ownerDocument.id;

    await database.insert(schema.documents).values({
      userId: otherUserId,
      title: "Another private Document",
      textContent: `The learner is running quickly beside ${uniqueTerm}.`,
    });
  });

  afterAll(async () => {
    if (!database) return;
    await database
      .delete(schema.users)
      .where(inArray(schema.users.id, [ownerId, otherUserId]));
    await database.$client.end();
  });

  test("matches English-normalized Document content for only the owner", async () => {
    const results = await searchDocuments(ownerId, "run");

    expect(results.map((document) => document.id)).toEqual([ownerDocumentId]);
  });

  test("the indexed search expression can select the Document GIN index", async () => {
    const plan = await database.transaction(async (transaction) => {
      await transaction.execute(sql`set local enable_seqscan = off`);
      return transaction.execute(sql`
        explain (costs off)
        select id
        from documents
        where to_tsvector('english', text_content)
          @@ plainto_tsquery('english', ${uniqueTerm})
      `);
    });
    const renderedPlan = plan
      .map((line) => Object.values(line).join(" "))
      .join("\n");

    expect(renderedPlan).toContain("documents_text_content_gin_idx");
  });
});
