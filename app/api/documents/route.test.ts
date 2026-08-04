/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, describe, mock } from "bun:test";

// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock<() => any>(() => ({ userId: "user-1" }));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

// ─── Mock documents DAL ──────────────────────────────────────────────────────
const mockListDocuments = mock<() => any>(() => []);
const mockSearchDocuments = mock<() => any>(() => []);
const mockCreateDocument = mock<() => any>(() => null);
mock.module("@/lib/db/documents", () => ({
  listDocuments: mockListDocuments,
  searchDocuments: mockSearchDocuments,
  createDocument: mockCreateDocument,
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
const fakeDoc = {
  id: "doc-1",
  userId: USER_ID,
  title: "Hello World",
  folderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeReq = (
  searchParams: Record<string, string> = {},
  body: unknown = {}
) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(searchParams) },
    json: () => Promise.resolve(body),
  }) as any;

describe("GET /api/documents", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await GET(makeReq() as any);
    expect(res.status).toBe(401);
  });

  test("returns full document list when no q param", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    mockListDocuments.mockReturnValueOnce([fakeDoc]);
    const res = await GET(makeReq() as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([fakeDoc]);
    expect(mockListDocuments).toHaveBeenCalledWith(USER_ID);
  });

  test("uses FTS search when q param is present", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    mockSearchDocuments.mockReturnValueOnce([fakeDoc]);
    const res = await GET(makeReq({ q: "hello" }) as any);
    const body = await res.json();
    expect(body).toEqual([fakeDoc]);
    expect(mockSearchDocuments).toHaveBeenCalledWith(USER_ID, "hello");
  });
});

describe("POST /api/documents", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(makeReq({}, {}) as any);
    expect(res.status).toBe(401);
  });

  test("creates document with no folderId and returns 201", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    mockCreateDocument.mockReturnValueOnce(fakeDoc);
    const res = await POST(makeReq({}, {}) as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(fakeDoc);
    expect(mockCreateDocument).toHaveBeenCalledWith(USER_ID, null);
  });

  test("creates document inside a folder", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    const docWithFolder = { ...fakeDoc, folderId: "folder-1" };
    mockCreateDocument.mockReturnValueOnce(docWithFolder);
    const res = await POST(makeReq({}, { folderId: "folder-1" }) as any);
    expect(res.status).toBe(201);
    expect(mockCreateDocument).toHaveBeenCalledWith(USER_ID, "folder-1");
  });
});
