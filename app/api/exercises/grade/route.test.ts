import { expect, test, describe, mock } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type { createGeminiService } from "@/lib/ai/gemini";
import type { listDueReviewItems, updateReviewItem } from "@/lib/db/review";
import type { ReviewItemWithSource } from "@/lib/db/review";

// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

// ─── Mock Gemini service ──────────────────────────────────────────────────────
const mockGenerate = mock(
  async () => '{"rating": 4, "feedback": "Good job, mostly correct."}'
);
const mockCreateGeminiService = mock<typeof createGeminiService>(() => ({
  generate: mockGenerate,
}));
class MockGeminiQuotaExhaustedError extends Error {
  constructor() {
    super("All Gemini API keys have reached their rate limits.");
    this.name = "GeminiQuotaExhaustedError";
  }
}
mock.module("@/lib/ai/gemini", () => ({
  createGeminiService: mockCreateGeminiService,
  GeminiQuotaExhaustedError: MockGeminiQuotaExhaustedError,
  GEMINI_MODELS: {
    FLASH: "gemini-3.6-flash",
    FLASH_LITE: "gemini-3.5-flash-lite",
  },
}));

// ─── Mock review DAL ──────────────────────────────────────────────────────────
const mockListDueReviewItems = mock<typeof listDueReviewItems>(async () => []);
const mockUpdateReviewItem = mock<typeof updateReviewItem>(async () => null);
mock.module("@/lib/db/review", () => ({
  listDueReviewItems: mockListDueReviewItems,
  updateReviewItem: mockUpdateReviewItem,
}));

// ─── Mock Next.js ─────────────────────────────────────────────────────────────
mock.module("next/server", () => {
  class NextResponse {
    status: number;
    data: unknown;
    static json(data: unknown, init?: { status?: number }) {
      return new NextResponse(data, { status: init?.status ?? 200 });
    }
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status ?? 200;
    }
    async json() {
      return this.data;
    }
  }
  return { NextResponse };
});

import { POST } from "./route";
import { NextResponse } from "next/server";

const USER_ID = "user-1";

const fakeCorrectionItem: ReviewItemWithSource = {
  id: "review-1",
  userId: USER_ID,
  source: "correction",
  correctionId: "corr-1",
  vocabularyItemId: null,
  interval: 1,
  easeFactor: 2.5,
  nextReviewAt: new Date(Date.now() - 1000),
  lastReviewedAt: null,
  createdAt: new Date(),
  correction: {
    id: "corr-1",
    userId: USER_ID,
    documentId: null,
    originalText: "I goed to the store",
    correctedText: "I went to the store",
    errorType: "grammar",
    context: null,
    starred: false,
    createdAt: new Date(),
  },
  vocabularyItem: null,
};

const makeReq = (body: unknown): NextRequest =>
  ({ json: () => Promise.resolve(body) }) as unknown as NextRequest;

const validBody = {
  reviewItemId: "review-1",
  exercisePrompt: "Rewrite this sentence correctly:\nI goed to the store",
  userAnswer: "I went to the store",
};

describe("POST /api/exercises/grade", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  test("returns 400 when required fields are missing", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const res = await POST(makeReq({ reviewItemId: "review-1" }));
    expect(res.status).toBe(400);
  });

  test("returns 400 when userAnswer is empty string", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const res = await POST(makeReq({ ...validBody, userAnswer: "   " }));
    expect(res.status).toBe(400);
  });

  test("returns 404 when review item is not due", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListDueReviewItems.mockReturnValueOnce(Promise.resolve([]));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(404);
  });

  test("returns grading result and updates SRS metadata on success", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListDueReviewItems.mockReturnValueOnce(
      Promise.resolve([fakeCorrectionItem])
    );
    mockGenerate.mockReturnValueOnce(
      Promise.resolve('{"rating": 5, "feedback": "Perfect answer!"}')
    );
    mockUpdateReviewItem.mockReturnValueOnce(
      Promise.resolve({ ...fakeCorrectionItem, interval: 6 })
    );

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as { rating: number }).rating).toBe(5);
    expect((body as { feedback: string }).feedback).toBe("Perfect answer!");
    expect((body as { nextReviewAt: string }).nextReviewAt).toBeDefined();
    // Verify SRS update was called
    expect(mockUpdateReviewItem).toHaveBeenCalledTimes(1);
  });

  test("returns 503 when grading JSON cannot be parsed", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListDueReviewItems.mockReturnValueOnce(
      Promise.resolve([fakeCorrectionItem])
    );
    mockGenerate.mockReturnValueOnce(
      Promise.resolve("Sorry, I cannot grade this right now.")
    );
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(503);
  });

  test("returns 503 on Gemini quota exhaustion", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListDueReviewItems.mockReturnValueOnce(
      Promise.resolve([fakeCorrectionItem])
    );
    mockGenerate.mockRejectedValueOnce(new MockGeminiQuotaExhaustedError());
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(503);
  });
});
