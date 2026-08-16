import { expect, test, describe, mock } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type {
  listVocabularyItems,
  createVocabularyItem,
  VocabularyItem,
} from "@/lib/db/vocabulary";

// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

// ─── Mock vocabulary DAL ─────────────────────────────────────────────────────
const mockListVocabularyItems = mock<typeof listVocabularyItems>(
  async () => []
);
const mockCreateVocabularyItem = mock<typeof createVocabularyItem>(
  async () => fakeItem
);
mock.module("@/lib/db/vocabulary", () => ({
  listVocabularyItems: mockListVocabularyItems,
  createVocabularyItem: mockCreateVocabularyItem,
}));

// ─── Mock Next.js internals ──────────────────────────────────────────────────
mock.module("next/server", () => {
  class NextResponse {
    static json(data: unknown, init?: { status?: number }) {
      return new NextResponse(data, init?.status ?? 200);
    }
    constructor(
      public data: unknown,
      public status: number = 200
    ) {}
    async json() {
      return this.data;
    }
  }
  return { NextResponse };
});

import { GET, POST } from "./route";
import { NextResponse } from "next/server";

const USER_ID = "user-1";
const fakeItem: VocabularyItem = {
  id: "vocab-1",
  userId: USER_ID,
  documentId: null,
  phrase: "serendipity",
  definition: "finding good things unexpectedly",
  exampleSentence: null,
  createdAt: new Date(),
};

describe("GET /api/vocabulary", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("returns vocabulary list", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListVocabularyItems.mockReturnValueOnce(Promise.resolve([fakeItem]));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([fakeItem]);
  });
});

describe("POST /api/vocabulary", () => {
  const makeReq = (body: unknown): NextRequest =>
    ({
      json: () => Promise.resolve(body),
    }) as unknown as NextRequest;

  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await POST(makeReq({ phrase: "word" }));
    expect(res.status).toBe(401);
  });

  test("returns 400 when phrase is missing", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  test("creates and returns vocabulary item with 201", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockCreateVocabularyItem.mockReturnValueOnce(Promise.resolve(fakeItem));
    const res = await POST(makeReq({ phrase: "serendipity" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(fakeItem);
  });
});
