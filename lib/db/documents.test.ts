import { expect, test, describe, mock } from "bun:test";
import type { Document } from "./documents";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockReturning = mock<() => unknown[]>(() => []);
const mockWhere = mock<
  () => { returning: typeof mockReturning; orderBy: typeof mockOrderBy }
>(() => ({
  returning: mockReturning,
  orderBy: mockOrderBy,
}));
const mockLimit = mock<() => unknown[]>(() => []);
const mockOrderBy = mock<(...args: unknown[]) => unknown>(() => {
  const res: unknown[] & { limit?: typeof mockLimit } = [];
  res.limit = mockLimit;
  return res;
});
const mockLeftJoin = mock<() => { where: typeof mockWhere }>(() => ({
  where: mockWhere,
}));
const mockFrom = mock<
  () => { where: typeof mockWhere; leftJoin: typeof mockLeftJoin }
>(() => ({
  where: mockWhere,
  leftJoin: mockLeftJoin,
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
const transactionDB = {
  select: mockSelect,
  insert: mock(() => ({ values: mockValues })),
  update: mock(() => ({ set: mockSet })),
};
const mockTransaction = mock(
  async (callback: (tx: typeof transactionDB) => Promise<unknown>) =>
    callback(transactionDB)
);

const mockDB = {
  select: mockSelect,
  delete: mock(() => ({ where: mockWhere })),
  transaction: mockTransaction,
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
  folders: {
    id: "folder_id",
    userId: "folder_user_id",
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
  listRecentDocuments,
  searchDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  FolderNotFoundError,
} from "./documents";

const USER_ID = "user-1";
const DOC_ID = "doc-1";
const FOLDER_ID = "folder-1";

function mockFolderLookup(folderId: string | null) {
  const folderWhere = mock((condition: unknown) => {
    void condition;
    return {
      for: mock(() => (folderId ? [{ id: folderId }] : [])),
    };
  });
  mockFrom.mockReturnValueOnce({
    where: folderWhere,
  } as unknown as ReturnType<typeof mockFrom>);
  return folderWhere;
}

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

describe("listRecentDocuments", () => {
  test("returns recent documents with folder info", async () => {
    mockLimit.mockReturnValueOnce([
      {
        id: DOC_ID,
        title: "Recent Document",
        folderId: FOLDER_ID,
        folderName: "Work",
        textContent: "Some snippet",
        createdAt: fakeDoc.createdAt,
        updatedAt: fakeDoc.updatedAt,
      },
    ]);
    const result = await listRecentDocuments(USER_ID, 6);
    expect(result).toHaveLength(1);
    expect(result[0].folderName).toBe("Work");
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
    expect(transactionDB.insert).toHaveBeenCalled();
  });

  test("creates with initial title, content, and textContent", async () => {
    const templateDoc = {
      ...fakeDoc,
      title: "Meeting Notes",
      content: { type: "doc" },
      textContent: "Agenda",
    };
    mockReturning.mockReturnValueOnce([templateDoc]);
    const result = await createDocument(USER_ID, null, {
      title: "Meeting Notes",
      content: { type: "doc" },
      textContent: "Agenda",
    });
    expect(result.title).toBe("Meeting Notes");
    expect(result.textContent).toBe("Agenda");
    expect(transactionDB.insert).toHaveBeenCalled();
  });

  test("creates with a folderId", async () => {
    const folderDoc = { ...fakeDoc, folderId: FOLDER_ID };
    mockFolderLookup(FOLDER_ID);
    mockReturning.mockReturnValueOnce([folderDoc]);
    const result = await createDocument(USER_ID, FOLDER_ID);
    expect(result.folderId).toBe(FOLDER_ID);
  });

  test("rejects a missing folder before inserting", async () => {
    mockFolderLookup(null);
    const insertsBeforeRequest = transactionDB.insert.mock.calls.length;

    await expect(
      createDocument(USER_ID, "missing-folder")
    ).rejects.toBeInstanceOf(FolderNotFoundError);
    expect(transactionDB.insert.mock.calls.length).toBe(insertsBeforeRequest);
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
    expect(transactionDB.update).toHaveBeenCalled();
  });

  test("returns null when document not found", async () => {
    mockReturning.mockReturnValueOnce([]);
    const result = await updateDocument(USER_ID, "nonexistent", { title: "X" });
    expect(result).toBeNull();
  });

  test("moves a document into an owned folder", async () => {
    const movedDocument = { ...fakeDoc, folderId: FOLDER_ID };
    mockFolderLookup(FOLDER_ID);
    mockReturning.mockReturnValueOnce([movedDocument]);

    const result = await updateDocument(USER_ID, DOC_ID, {
      folderId: FOLDER_ID,
    });

    expect(result?.folderId).toBe(FOLDER_ID);
  });

  test("moves a document to the root", async () => {
    mockReturning.mockReturnValueOnce([fakeDoc]);

    const result = await updateDocument(USER_ID, DOC_ID, { folderId: null });

    expect(result?.folderId).toBeNull();
  });

  test("saves content and textContent when provided", async () => {
    const editorContent = { type: "doc", content: [{ type: "paragraph" }] };
    const updated = {
      ...fakeDoc,
      content: editorContent,
      textContent: "Hello from editor",
    };
    mockReturning.mockReturnValueOnce([updated]);

    const result = await updateDocument(USER_ID, DOC_ID, {
      content: editorContent,
      textContent: "Hello from editor",
    });

    expect(result?.content).toEqual(editorContent);
    expect(result?.textContent).toBe("Hello from editor");
    expect(transactionDB.update).toHaveBeenCalled();
  });

  test("rejects a cross-account folder before changing the document", async () => {
    mockFolderLookup(null);
    const updatesBeforeRequest = transactionDB.update.mock.calls.length;

    await expect(
      updateDocument(USER_ID, DOC_ID, { folderId: "foreign-folder" })
    ).rejects.toBeInstanceOf(FolderNotFoundError);

    expect(transactionDB.update.mock.calls.length).toBe(updatesBeforeRequest);
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
