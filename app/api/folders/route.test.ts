import { expect, test, describe, mock } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type { listFolders, createFolder, Folder } from "@/lib/db/folders";

// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

// ─── Mock folders DAL ────────────────────────────────────────────────────────
const mockListFolders = mock<typeof listFolders>(async () => []);
const mockCreateFolder = mock<typeof createFolder>(async () => fakeFolder);
mock.module("@/lib/db/folders", () => ({
  listFolders: mockListFolders,
  createFolder: mockCreateFolder,
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
const fakeFolder: Folder = {
  id: "folder-1",
  userId: USER_ID,
  name: "Work",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/folders", () => {
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

  test("returns folder list for authenticated user", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListFolders.mockReturnValueOnce(Promise.resolve([fakeFolder]));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([fakeFolder]);
  });

  test("returns empty array when no folders", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockListFolders.mockReturnValueOnce(Promise.resolve([]));
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/folders", () => {
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
    const res = await POST(makeReq({ name: "Work" }));
    expect(res.status).toBe(401);
  });

  test("returns 400 when name is missing", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect((body as { error: string }).error).toBe("name is required");
  });

  test("creates and returns folder with 201", async () => {
    mockRequireSession.mockReturnValueOnce(
      Promise.resolve({ userId: USER_ID })
    );
    mockCreateFolder.mockReturnValueOnce(Promise.resolve(fakeFolder));
    const res = await POST(makeReq({ name: "Work" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(fakeFolder);
  });
});
