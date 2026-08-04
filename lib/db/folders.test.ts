import { expect, test, describe, mock } from "bun:test";

// ─── Mock the db module ────────────────────────────────────────────────────────
// We mock at the module level so every import of "@/db" in lib/db/folders.ts
// gets the same fake client.

const mockReturning = mock(() => []);
const mockWhere = mock(() => ({ returning: mockReturning }));
const mockOrderBy = mock(() => []);
const mockValues = mock(() => ({ returning: mockReturning }));
const mockSet = mock(() => ({ where: mockWhere }));

const mockDB = {
  select: mock(() => ({
    from: mock(() => ({ where: mock(() => ({ orderBy: mockOrderBy })) })),
  })),
  insert: mock(() => ({ values: mockValues })),
  update: mock(() => ({ set: mockSet })),
  delete: mock(() => ({ where: mockWhere })),
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

// Stub drizzle operators — they just return their args for test purposes
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
    const fakeFolder = {
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
    const fakeFolder = {
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
    const updated = {
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
