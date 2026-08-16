import { expect, test, describe, mock } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type { createGeminiService } from "@/lib/ai/gemini";
import type { getDocument } from "@/lib/db/documents";

// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

// ─── Mock gemini service ──────────────────────────────────────────────────────
const mockGenerate = mock(
  async () => "That is a great question about grammar!"
);
const mockCreateGeminiService = mock<typeof createGeminiService>(() => ({
  generate: mockGenerate,
}));
class MockGeminiQuotaExhaustedError extends Error {
  constructor() {
    super("quota exhausted");
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

// ─── Mock documents DAL ───────────────────────────────────────────────────────
const mockGetDocument = mock<typeof getDocument>(async () => null);
mock.module("@/lib/db/documents", () => ({
  getDocument: mockGetDocument,
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

const makeReq = (body: unknown): NextRequest =>
  ({ json: () => Promise.resolve(body) }) as unknown as NextRequest;

describe("POST /api/chat", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await POST(
      makeReq({ messages: [{ role: "user", content: "Hi" }] })
    );
    expect(res.status).toBe(401);
  });

  test("returns 400 when messages is empty", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: "user-1" })
    );
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(400);
  });

  test("returns 400 when messages is invalid", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: "user-1" })
    );
    const res = await POST(makeReq({ messages: "not-an-array" }));
    expect(res.status).toBe(400);
  });

  test("returns AI reply for valid messages", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: "user-1" })
    );
    mockGenerate.mockReturnValueOnce(Promise.resolve("Grammar tip here"));
    const res = await POST(
      makeReq({
        messages: [{ role: "user", content: "What is present perfect?" }],
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as { reply: string }).reply).toBe("Grammar tip here");
  });

  test("fetches document context when includeDocument is true", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: "user-1" })
    );
    mockGetDocument.mockReturnValueOnce(
      Promise.resolve({
        id: "doc-1",
        textContent: "This is the document content",
      } as Awaited<ReturnType<typeof getDocument>>)
    );
    mockGenerate.mockReturnValueOnce(Promise.resolve("Answer with context"));
    const res = await POST(
      makeReq({
        messages: [{ role: "user", content: "Explain this" }],
        includeDocument: true,
        documentId: "doc-1",
      })
    );
    expect(res.status).toBe(200);
    expect(mockGetDocument).toHaveBeenCalledWith("user-1", "doc-1");
  });

  test("returns 503 on quota exhaustion", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: "user-1" })
    );
    mockGenerate.mockRejectedValueOnce(new MockGeminiQuotaExhaustedError());
    const res = await POST(
      makeReq({ messages: [{ role: "user", content: "Help" }] })
    );
    expect(res.status).toBe(503);
  });
});
