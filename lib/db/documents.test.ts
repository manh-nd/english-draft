import { expect, test, describe, mock, type Mock } from "bun:test";
import type { Document } from "./documents";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockReturning = mock<() => unknown[]>(() => []);
const mockWhere = mock<() => { returning: typeof mockReturning }>(() => ({
  returning: mockReturning,
}));
const mockOrderBy = mock<() => unknown[]>(() => []);
const mockFrom = mock<
  () => { where: Mock<() => { orderBy: typeof mockOrderBy }> }
>(() => ({
  where: mock(() => ({ orderBy: mockOrderBy })),
}));
const mockSelect = mock<() => { from: typeof mockFrom }>(() => ({
  from: mockFrom,
}));
const mockValues = mock<() => { returning: typeof mockReturning }>(() => ({
  returning: mockReturning,
}));
const mockSet = mock<() => { where: typeof mockWhere }>(() => ({
  where: mockWhere,
}));

const mockDB = {
  select: mockSelect,
  insert: mock(() => ({ values: mockValues })),
  update: mock(() => ({ set: mockSet })),
  delete: mock(() => ({ where: mockWhere })),
};

mock.module("@/db", () => ({ db: mockDB }));
mock.module("@/db/schema", () => ({
  documents: {
    id: "id",
    userId: "user_id",
    folderId: "folder_id",
    title: "title",
    content: "content",
    textContent: "text_content",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

mock.module("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val, op: "eq" }),
  and: (...args: unknown[]) => ({ args, op: "and" }),
  asc: (col: unknown) => ({ col, op: "asc" }),
  desc: (col: unknown) => ({ col, op: "desc" }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    op: "sql",
  }),
}));

import {
  listDocuments,
  searchDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "./documents";

const USER_ID = "user-1";
const DOC_ID = "doc-1";

const fakeDoc: Document = {
  id: DOC_ID,
  userId: USER_ID,
  title: "Hello World",
  folderId: null,
  content: null,
  textContent: "Hello World",
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("listDocuments", () => {
  test("returns documents for a user", async () => {
    mockOrderBy.mockReturnValueOnce([fakeDoc]);
    const result = await listDocuments(USER_ID);
    expect(result).toEqual([fakeDoc]);
    expect(mockDB.select).toHaveBeenCalled();
  });

  test("returns empty array when no documents", async () => {
    mockOrderBy.mockReturnValueOnce([]);
    const result = await listDocuments(USER_ID);
    expect(result).toEqual([]);
  });
});

describe("searchDocuments", () => {
  test("returns matching documents", async () => {
    mockOrderBy.mockReturnValueOnce([fakeDoc]);
    const result = await searchDocuments(USER_ID, "Hello");
    expect(result).toEqual([fakeDoc]);
    expect(mockDB.select).toHaveBeenCalled();
  });

  test("returns empty array for no matches", async () => {
    mockOrderBy.mockReturnValueOnce([]);
    const result = await searchDocuments(USER_ID, "xyz");
    expect(result).toEqual([]);
  });
});

describe("getDocument", () => {
  test("returns the document when found", async () => {
    mockFrom.mockReturnValueOnce({
      where: mock(() => [fakeDoc]),
    } as unknown as ReturnType<typeof mockFrom>);
    const result = await getDocument(USER_ID, DOC_ID);
    expect(result).toEqual(fakeDoc);
  });

  test("returns null when not found", async () => {
    mockFrom.mockReturnValueOnce({
      where: mock(() => []),
    } as unknown as ReturnType<typeof mockFrom>);
    const result = await getDocument(USER_ID, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("createDocument", () => {
  test("creates with default title Untitled", async () => {
    mockReturning.mockReturnValueOnce([{ ...fakeDoc, title: "Untitled" }]);
    const result = await createDocument(USER_ID);
    expect(result.title).toBe("Untitled");
    expect(mockDB.insert).toHaveBeenCalled();
  });

  test("creates with a folderId", async () => {
    const folderDoc = { ...fakeDoc, folderId: "folder-1" };
    mockReturning.mockReturnValueOnce([folderDoc]);
    const result = await createDocument(USER_ID, "folder-1");
    expect(result.folderId).toBe("folder-1");
  });
});

describe("updateDocument", () => {
  test("returns updated document on success", async () => {
    const updated = { ...fakeDoc, title: "Renamed Doc" };
    mockReturning.mockReturnValueOnce([updated]);
    const result = await updateDocument(USER_ID, DOC_ID, {
      title: "Renamed Doc",
    });
    expect(result?.title).toBe("Renamed Doc");
    expect(mockDB.update).toHaveBeenCalled();
  });

  test("returns null when document not found", async () => {
    mockReturning.mockReturnValueOnce([]);
    const result = await updateDocument(USER_ID, "nonexistent", { title: "X" });
    expect(result).toBeNull();
  });
});

describe("deleteDocument", () => {
  test("returns true when deleted", async () => {
    mockReturning.mockReturnValueOnce([{ id: DOC_ID }]);
    const result = await deleteDocument(USER_ID, DOC_ID);
    expect(result).toBe(true);
    expect(mockDB.delete).toHaveBeenCalled();
  });

  test("returns false when not found", async () => {
    mockReturning.mockReturnValueOnce([]);
    const result = await deleteDocument(USER_ID, "nonexistent");
    expect(result).toBe(false);
  });
});
