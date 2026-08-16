import { expect, test, describe, mock } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type {
  toggleCorrectionStar,
  deleteCorrection,
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
const mockToggleStar = mock<typeof toggleCorrectionStar>(
  async () => fakeCorrection
);
const mockDeleteCorrection = mock<typeof deleteCorrection>(async () => true);
mock.module("@/lib/db/corrections", () => ({
  toggleCorrectionStar: mockToggleStar,
  deleteCorrection: mockDeleteCorrection,
}));

// ─── Mock Next.js internals ──────────────────────────────────────────────────
mock.module("next/server", () => {
  class NextResponse {
    status: number;
    data: unknown;
    static json(data: unknown, init?: { status?: number }) {
      return new NextResponse(data, { status: init?.status ?? 200 });
    }
    constructor(data: unknown, init?: { status?: number } | number) {
      this.data = data;
      this.status = typeof init === "number" ? init : (init?.status ?? 200);
    }
    async json() {
      return this.data;
    }
  }
  return { NextResponse };
});

import { PATCH, DELETE } from "./route";
import { NextResponse } from "next/server";

const USER_ID = "user-1";
const fakeCorrection: Correction = {
  id: "corr-1",
  userId: USER_ID,
  documentId: null,
  originalText: "I goed",
  correctedText: "I went",
  errorType: "grammar",
  context: null,
  starred: true,
  createdAt: new Date(),
};

const makeReq = (body: unknown): NextRequest =>
  ({
    json: () => Promise.resolve(body),
  }) as unknown as NextRequest;

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/corrections/:id (toggle star)", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await PATCH(makeReq({}), makeParams("corr-1"));
    expect(res.status).toBe(401);
  });

  test("returns starred correction", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockToggleStar.mockReturnValueOnce(Promise.resolve(fakeCorrection));
    const res = await PATCH(makeReq({}), makeParams("corr-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Correction).starred).toBe(true);
  });

  test("returns 404 when correction not found", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockToggleStar.mockReturnValueOnce(Promise.resolve(null));
    const res = await PATCH(makeReq({}), makeParams("corr-999"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/corrections/:id", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await DELETE(makeReq({}), makeParams("corr-1"));
    expect(res.status).toBe(401);
  });

  test("returns 204 on successful delete", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockDeleteCorrection.mockReturnValueOnce(Promise.resolve(true));
    const res = await DELETE(makeReq({}), makeParams("corr-1"));
    expect(res.status).toBe(204);
  });

  test("returns 404 when not found", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockDeleteCorrection.mockReturnValueOnce(Promise.resolve(false));
    const res = await DELETE(makeReq({}), makeParams("corr-999"));
    expect(res.status).toBe(404);
  });
});
