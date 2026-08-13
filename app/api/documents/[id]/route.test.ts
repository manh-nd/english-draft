import { describe, expect, mock, test } from "bun:test";
import type { NextRequest } from "next/server";
import type { requireSession } from "@/lib/api/require-session";
import type {
  deleteDocument,
  Document,
  getDocument,
  updateDocument,
} from "@/lib/db/documents";

class MockFolderNotFoundError extends Error {}

const USER_ID = "user-1";
const DOCUMENT_ID = "00000000-0000-4000-8000-000000000010";
const FOLDER_ID = "00000000-0000-4000-8000-000000000001";

const fakeDocument: Document = {
  id: DOCUMENT_ID,
  userId: USER_ID,
  title: "Hello World",
  folderId: null,
  content: null,
  textContent: "Hello World",
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: USER_ID,
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

const mockGetDocument = mock<typeof getDocument>(async () => fakeDocument);
const mockUpdateDocument = mock<typeof updateDocument>(
  async () => fakeDocument
);
const mockDeleteDocument = mock<typeof deleteDocument>(async () => true);
mock.module("@/lib/db/documents", () => ({
  getDocument: mockGetDocument,
  updateDocument: mockUpdateDocument,
  deleteDocument: mockDeleteDocument,
  FolderNotFoundError: MockFolderNotFoundError,
}));

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

import { PATCH } from "./route";

const makeRequest = (body: unknown): NextRequest =>
  ({ json: () => Promise.resolve(body) }) as unknown as NextRequest;

const routeParams = {
  params: Promise.resolve({ id: DOCUMENT_ID }),
};

describe("PATCH /api/documents/:id", () => {
  test("moves a Document into an owned Folder", async () => {
    const movedDocument = { ...fakeDocument, folderId: FOLDER_ID };
    mockUpdateDocument.mockReturnValueOnce(Promise.resolve(movedDocument));

    const res = await PATCH(makeRequest({ folderId: FOLDER_ID }), routeParams);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(movedDocument);
    expect(mockUpdateDocument).toHaveBeenCalledWith(USER_ID, DOCUMENT_ID, {
      folderId: FOLDER_ID,
    });
  });

  test("moves a Document to the root", async () => {
    mockUpdateDocument.mockReturnValueOnce(Promise.resolve(fakeDocument));

    const res = await PATCH(makeRequest({ folderId: null }), routeParams);

    expect(res.status).toBe(200);
    expect(mockUpdateDocument).toHaveBeenCalledWith(USER_ID, DOCUMENT_ID, {
      folderId: null,
    });
  });

  test("rejects an invalid Folder identifier before updating", async () => {
    const callsBeforeRequest = mockUpdateDocument.mock.calls.length;

    const res = await PATCH(
      makeRequest({ folderId: "not-a-uuid" }),
      routeParams
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid Folder identifier" });
    expect(mockUpdateDocument.mock.calls.length).toBe(callsBeforeRequest);
  });

  test("maps a rejected Folder assignment to not found", async () => {
    mockUpdateDocument.mockRejectedValueOnce(new MockFolderNotFoundError());

    const res = await PATCH(makeRequest({ folderId: FOLDER_ID }), routeParams);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Folder not found" });
  });

  test("saves content and textContent when provided", async () => {
    const editorContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
    };
    const savedDoc = {
      ...fakeDocument,
      content: editorContent,
      textContent: "Hi",
    };
    mockUpdateDocument.mockReturnValueOnce(Promise.resolve(savedDoc));

    const res = await PATCH(
      makeRequest({ content: editorContent, textContent: "Hi" }),
      routeParams
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(savedDoc);
    expect(mockUpdateDocument).toHaveBeenCalledWith(USER_ID, DOCUMENT_ID, {
      content: editorContent,
      textContent: "Hi",
    });
  });
});
