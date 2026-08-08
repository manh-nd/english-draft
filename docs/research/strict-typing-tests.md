# Research Report: Eliminating `any` Types & `eslint-disable` Comments in Bun & Next.js Test Suite

**Target Document Location:** `docs/research/strict-typing-tests.md`

**Status:** Research Completed

---

## Executive Summary

This research investigates how to eliminate **100% of `any` types** and all `/* eslint-disable @typescript-eslint/no-explicit-any */` directives across all Bun test runner (`bun:test`) files, Drizzle ORM DAL unit tests, and Next.js App Router API route tests.

### Codebase Scope & Diagnosis

An audit of the codebase revealed **26 instances** of `any` across 4 test files:

1. `app/api/documents/route.test.ts` (7 occurrences: `mock<() => any>`, `makeReq as any`, `GET(makeReq() as any)`, etc.)
2. `app/api/folders/route.test.ts` (4 occurrences: `mock<() => any>`, `makeReq as any`)
3. `lib/db/documents.test.ts` (8 occurrences: `mock<() => any>` for Drizzle chainable methods)
4. `lib/db/folders.test.ts` (7 occurrences: `mock<() => any>` for Drizzle chainable methods)

All 4 files currently disable ESLint's `@typescript-eslint/no-explicit-any` rule on line 1. By adopting strict TypeScript techniques (`typeof func`, `Mock<T>`, `unknown as NextRequest`, and typed builder chains), all 4 files can be refactored to achieve **100% strict TypeScript type coverage** without disabling ESLint rules.

---

## 1. Strict Mocking with Bun Test Runner (`bun:test`)

### 1.1 Typing `mock()` Functions without `any`

In `bun:test` (`@types/bun` / `bun-types/test.d.ts`), `mock()` is declared as:

```ts
export type Mock<T extends (...args: any[]) => any> = JestMock.Mock<T>;
export const mock: {
  <T extends (...args: any[]) => any>(Function?: T): Mock<T>;
};
```

Instead of parameterizing `mock()` with `() => any`, TypeScript provides three strict alternatives:

#### Pattern A: Utility type `typeof function` (Recommended for imports)

When mocking an existing function from a module or DAL:

```ts
import type {
  listDocuments,
  searchDocuments,
  createDocument,
} from "@/lib/db/documents";

// Types are derived directly from the real implementation signature
const mockListDocuments = mock<typeof listDocuments>(async () => []);
const mockSearchDocuments = mock<typeof searchDocuments>(async () => []);
const mockCreateDocument = mock<typeof createDocument>(async () => fakeDoc);
```

**Advantage:** If the underlying DAL function signature changes (e.g., adding an optional argument or changing return type), TypeScript will immediately flag type mismatches in the test mock.

#### Pattern B: Explicit Generic Signatures (`Mock<() => ReturnType>`)

For functions with polymorphic or union return types (e.g., authentication session guards):

```ts
import type { requireSession } from "@/lib/api/require-session";

// requireSession returns Promise<{ userId: string } | NextResponse>
const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
```

When overriding return values per test:

```ts
mockRequireSession.mockReturnValueOnce(
  Promise.resolve(
    NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    ) as unknown as NextResponse
  )
);
```

### 1.2 Typing Module Mocks (`mock.module`)

`mock.module(id: string, factory: () => Record<string, unknown>)` is typed in `bun:test` with a factory return of `any`. However, the factory implementation inside `mock.module` can be written strictly without `: any`:

```ts
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

mock.module("@/lib/db/documents", () => ({
  listDocuments: mockListDocuments,
  searchDocuments: mockSearchDocuments,
  createDocument: mockCreateDocument,
}));
```

### 1.3 Strict Typing for Chainable Drizzle ORM Queries

In `lib/db/documents.test.ts` and `lib/db/folders.test.ts`, Drizzle query builders are chained:
`db.select().from(...).where(...).orderBy(...)`

Instead of `mock<() => any>`, we type each step in the chain using `unknown[]` and explicit return signatures with `typeof` references:

```ts
import { mock, type Mock } from "bun:test";

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
  insert: mock<() => { values: typeof mockValues }>(() => ({
    values: mockValues,
  })),
  update: mock<() => { set: typeof mockSet }>(() => ({ set: mockSet })),
  delete: mock<() => { where: typeof mockWhere }>(() => ({ where: mockWhere })),
};
```

---

## 2. Strict Mocking for Next.js `NextRequest` and `NextResponse`

### 2.1 Request Helper Functions (`makeReq`) without `as any`

Route handlers accept `req: NextRequest`. In tests, passing a partial mock object like `{ nextUrl: ..., json: ... }` causes TypeScript to reject it if cast with standard types, leading developers to use `as any`.

#### Strict Solution: `as unknown as NextRequest`

```ts
import type { NextRequest } from "next/server";

const makeReq = (
  searchParams: Record<string, string> = {},
  body: unknown = {}
): NextRequest =>
  ({
    nextUrl: { searchParams: new URLSearchParams(searchParams) },
    json: () => Promise.resolve(body),
  }) as unknown as NextRequest;
```

**Why this is strictly compliant:**

1. `as unknown as NextRequest` performs a double type assertion (from structural literal to `unknown`, then to `NextRequest`).
2. Unlike `as any`, it **does not disable type checking** elsewhere in the file.
3. It completely satisfies ESLint's `@typescript-eslint/no-explicit-any` rule.

#### Alternative Solution: `new NextRequest(url, init)`

For tests where full Web API behavior (headers, body streaming, cookies) is desired:

```ts
import { NextRequest } from "next/server";

function makeReq(
  url = "http://localhost/api/documents",
  body?: unknown
): NextRequest {
  return new NextRequest(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}
```

---

## 3. Primary Sources & References

1. **Bun TypeScript Documentation (`@types/bun` / `bun-types/test.d.ts`)**:
   - `Mock<T extends (...args: any[]) => any>` signature definition.
   - Overloads for `mock()`, `mock.module()`, and `spyOn()`.
2. **Next.js Server API Reference (`next/server`)**:
   - `NextRequest` extends standard Web API `Request` with `nextUrl: NextURL`.
   - `NextResponse.json(data, init)` static helper method.
3. **TypeScript Handbook — Avoiding `any`**:
   - **`unknown` vs `any`**: `unknown` requires narrowing or explicit assertions, maintaining full type safety.
   - **Double Assertion (`as unknown as T`)**: The standard pattern in TypeScript for mocking complex interfaces without using `any`.
   - **`typeof` operator & ReturnType**: Inferring types directly from source declarations.

---

## 4. Concrete Code Implementations

Below are the complete, 100% strict TypeScript implementations for all 4 affected files.

### 4.1 `app/api/documents/route.test.ts`

```ts
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
    const docWithFolder: Document = { ...fakeDoc, folderId: "folder-1" };
    mockCreateDocument.mockReturnValueOnce(Promise.resolve(docWithFolder));
    const res = await POST(makeReq({}, { folderId: "folder-1" }));
    expect(res.status).toBe(201);
    expect(mockCreateDocument).toHaveBeenCalledWith(USER_ID, "folder-1");
  });
});
```

### 4.2 `app/api/folders/route.test.ts`

```ts
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
```

### 4.3 `lib/db/documents.test.ts`

```ts
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
```

### 4.4 `lib/db/folders.test.ts`

```ts
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
```
