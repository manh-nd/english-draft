import { expect, test, describe, mock, type Mock } from "bun:test";
import type { Folder } from "./folders";

// ─── Mock the db module ────────────────────────────────────────────────────────

const mockReturning = mock<() => unknown[]>(() => []);
const mockWhere = mock<() => { returning: typeof mockReturning }>(() => ({
  returning: mockReturning,
}));
const mockOrderBy = mock<() => unknown[]>(() => []);
const mockValues = mock<() => { returning: typeof mockReturning }>(() => ({
  returning: mockReturning,
}));
const mockSet = mock<() => { where: typeof mockWhere }>(() => ({
  where: mockWhere,
}));

const mockFrom = mock<
  () => { where: Mock<() => { orderBy: typeof mockOrderBy }> }
>(() => ({
  where: mock(() => ({ orderBy: mockOrderBy })),
}));

const mockSelect = mock<() => { from: typeof mockFrom }>(() => ({
  from: mockFrom,
}));

const mockDB = {
  select: mockSelect,
  insert: mock<() => { values: typeof mockValues }>(() => ({
    values: mockValues,
  })),
  update: mock<() => { set: typeof mockSet }>(() => ({ set: mockSet })),
  delete: mock<() => { where: typeof mockWhere }>(() => ({
    where: mockWhere,
  })),
};

mock.module("@/db", () => ({ db: mockDB }));
mock.module("@/db/schema", () => ({
  folders: {
    id: "id",
    userId: "user_id",
    name: "name",
    updatedAt: "updated_at",
  },
}));

mock.module("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val, op: "eq" }),
  and: (...args: unknown[]) => ({ args, op: "and" }),
  asc: (col: unknown) => ({ col, op: "asc" }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    op: "sql",
  }),
}));

import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
} from "./folders";

const USER_ID = "user-1";
const FOLDER_ID = "folder-1";

describe("listFolders", () => {
  test("returns folders for a user", async () => {
    const fakeFolder: Folder = {
      id: FOLDER_ID,
      userId: USER_ID,
      name: "Work",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockOrderBy.mockReturnValueOnce([fakeFolder]);

    const result = await listFolders(USER_ID);

    expect(result).toEqual([fakeFolder]);
    expect(mockDB.select).toHaveBeenCalled();
  });

  test("returns empty array when user has no folders", async () => {
    mockOrderBy.mockReturnValueOnce([]);

    const result = await listFolders(USER_ID);

    expect(result).toEqual([]);
  });
});

describe("createFolder", () => {
  test("inserts a new folder and returns it", async () => {
    const fakeFolder: Folder = {
      id: FOLDER_ID,
      userId: USER_ID,
      name: "Personal",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockReturnValueOnce([fakeFolder]);

    const result = await createFolder(USER_ID, "Personal");

    expect(result).toEqual(fakeFolder);
    expect(mockDB.insert).toHaveBeenCalled();
  });
});

describe("renameFolder", () => {
  test("returns the renamed folder on success", async () => {
    const updated: Folder = {
      id: FOLDER_ID,
      userId: USER_ID,
      name: "Renamed",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockReturnValueOnce([updated]);

    const result = await renameFolder(USER_ID, FOLDER_ID, "Renamed");

    expect(result).toEqual(updated);
    expect(mockDB.update).toHaveBeenCalled();
  });

  test("returns null when folder not found", async () => {
    mockReturning.mockReturnValueOnce([]);

    const result = await renameFolder(USER_ID, "nonexistent", "New Name");

    expect(result).toBeNull();
  });
});

describe("deleteFolder", () => {
  test("returns true when folder deleted", async () => {
    mockReturning.mockReturnValueOnce([{ id: FOLDER_ID }]);

    const result = await deleteFolder(USER_ID, FOLDER_ID);

    expect(result).toBe(true);
    expect(mockDB.delete).toHaveBeenCalled();
  });

  test("returns false when folder not found", async () => {
    mockReturning.mockReturnValueOnce([]);

    const result = await deleteFolder(USER_ID, "nonexistent");

    expect(result).toBe(false);
  });
});
