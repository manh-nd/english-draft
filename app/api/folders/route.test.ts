import { expect, test, describe, mock } from "bun:test";
// ─── Mock require-session ────────────────────────────────────────────────────
const mockRequireSession = mock(() => ({ userId: "user-1" }));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));
// ─── Mock folders DAL ────────────────────────────────────────────────────────
const mockListFolders = mock(() => []);
const mockCreateFolder = mock(() => null);
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
const fakeFolder = {
  id: "folder-1",
  userId: USER_ID,
  name: "Work",
  createdAt: new Date(),
  updatedAt: new Date(),
};
describe("GET /api/folders", () => {
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });
  test("returns folder list for authenticated user", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    mockListFolders.mockReturnValueOnce([fakeFolder]);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([fakeFolder]);
  });
  test("returns empty array when no folders", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    mockListFolders.mockReturnValueOnce([]);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
describe("POST /api/folders", () => {
  const makeReq = (body: unknown) => ({
    json: () => Promise.resolve(body),
  });
  test("returns 401 when unauthenticated", async () => {
    mockRequireSession.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(makeReq({ name: "Work" }) as unknown);
    expect(res.status).toBe(401);
  });
  test("returns 400 when name is missing", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    const res = await POST(makeReq({}) as unknown);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("name is required");
  });
  test("creates and returns folder with 201", async () => {
    mockRequireSession.mockReturnValueOnce({ userId: USER_ID });
    mockCreateFolder.mockReturnValueOnce(fakeFolder);
    const res = await POST(makeReq({ name: "Work" }) as unknown);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(fakeFolder);
  });
});
