import { expect, test, describe, mock } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type {
  listCorrections,
  createCorrection,
  Correction,
} from "@/lib/db/corrections";

// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

// ─── Mock corrections DAL ────────────────────────────────────────────────────
const mockListCorrections = mock<typeof listCorrections>(async () => []);
const mockCreateCorrection = mock<typeof createCorrection>(
  async () => fakeCorrection
);
mock.module("@/lib/db/corrections", () => ({
  listCorrections: mockListCorrections,
  createCorrection: mockCreateCorrection,
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
const fakeCorrection: Correction = {
  id: "corr-1",
  userId: USER_ID,
  documentId: "doc-1",
  originalText: "I goed to the store",
  correctedText: "I went to the store",
  errorType: "grammar",
  context: null,
  starred: false,
  createdAt: new Date(),
};

describe("GET /api/corrections", () => {
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

  test("returns correction list for authenticated user", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListCorrections.mockReturnValueOnce(Promise.resolve([fakeCorrection]));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([fakeCorrection]);
  });

  test("returns empty array when no corrections", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListCorrections.mockReturnValueOnce(Promise.resolve([]));
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/corrections", () => {
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
    const res = await POST(
      makeReq({ originalText: "x", correctedText: "y", errorType: "grammar" })
    );
    expect(res.status).toBe(401);
  });

  test("returns 400 when required fields are missing", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const res = await POST(makeReq({ originalText: "x" }));
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid errorType", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const res = await POST(
      makeReq({ originalText: "x", correctedText: "y", errorType: "bad" })
    );
    expect(res.status).toBe(400);
  });

  test("creates and returns correction with 201", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockCreateCorrection.mockReturnValueOnce(Promise.resolve(fakeCorrection));
    const res = await POST(
      makeReq({
        originalText: "I goed",
        correctedText: "I went",
        errorType: "grammar",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(fakeCorrection);
  });
});
