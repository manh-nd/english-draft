import { expect, test, describe, mock } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type {
  listDocuments,
  searchDocuments,
  createDocument,
  Document,
  DocumentListItem,
} from "@/lib/db/documents";

class MockFolderNotFoundError extends Error {}

// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

// ─── Mock documents DAL ──────────────────────────────────────────────────────
const mockListDocuments = mock<typeof listDocuments>(async () => []);
const mockSearchDocuments = mock<typeof searchDocuments>(async () => []);
const mockCreateDocument = mock<typeof createDocument>(async () => fakeDoc);
mock.module("@/lib/db/documents", () => ({
  listDocuments: mockListDocuments,
  searchDocuments: mockSearchDocuments,
  createDocument: mockCreateDocument,
  FolderNotFoundError: MockFolderNotFoundError,
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
const FOLDER_ID = "00000000-0000-4000-8000-000000000001";
const fakeDocListItem: DocumentListItem = {
  id: "doc-1",
  title: "Hello World",
  folderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeDoc: Document = {
  id: "doc-1",
  userId: USER_ID,
  title: "Hello World",
  folderId: null,
  content: null,
  textContent: "Hello World",
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeReq = (
  searchParams: Record<string, string> = {},
  body: unknown = {}
): NextRequest =>
  ({
    nextUrl: { searchParams: new URLSearchParams(searchParams) },
    json: () => Promise.resolve(body),
  }) as unknown as NextRequest;

describe("GET /api/documents", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  test("returns full document list when no q param", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListDocuments.mockReturnValueOnce(Promise.resolve([fakeDocListItem]));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([fakeDocListItem]);
    expect(mockListDocuments).toHaveBeenCalledWith(USER_ID);
  });

  test("uses FTS search when q param is present", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockSearchDocuments.mockReturnValueOnce(Promise.resolve([fakeDocListItem]));
    const res = await GET(makeReq({ q: "hello" }));
    const body = await res.json();
    expect(body).toEqual([fakeDocListItem]);
    expect(mockSearchDocuments).toHaveBeenCalledWith(USER_ID, "hello");
  });
});

describe("POST /api/documents", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as unknown as NextResponse
      )
    );
    const res = await POST(makeReq({}, {}));
    expect(res.status).toBe(401);
  });

  test("creates document with no folderId and returns 201", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockCreateDocument.mockReturnValueOnce(Promise.resolve(fakeDoc));
    const res = await POST(makeReq({}, {}));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(fakeDoc);
    expect(mockCreateDocument).toHaveBeenCalledWith(USER_ID, null);
  });

  test("creates document inside a folder", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const docWithFolder: Document = { ...fakeDoc, folderId: FOLDER_ID };
    mockCreateDocument.mockReturnValueOnce(Promise.resolve(docWithFolder));
    const res = await POST(makeReq({}, { folderId: FOLDER_ID }));
    expect(res.status).toBe(201);
    expect(mockCreateDocument).toHaveBeenCalledWith(USER_ID, FOLDER_ID);
  });

  test("rejects an invalid Folder identifier", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const callsBeforeRequest = mockCreateDocument.mock.calls.length;

    const res = await POST(makeReq({}, { folderId: "not-a-uuid" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid Folder identifier" });
    expect(mockCreateDocument.mock.calls.length).toBe(callsBeforeRequest);
  });

  test("maps a rejected Folder assignment to not found", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockCreateDocument.mockRejectedValueOnce(new MockFolderNotFoundError());

    const res = await POST(makeReq({}, { folderId: FOLDER_ID }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Folder not found" });
  });
});
