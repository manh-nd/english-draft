import { afterEach, describe, expect, mock, test } from "bun:test";
import React from "react";
import { useSidebarData } from "@/hooks/use-sidebar-data";

type HookResult = ReturnType<typeof useSidebarData>;
type StateSetter<T> = (value: T | ((previous: T) => T)) => void;

const reactInternals = (
  React as unknown as Record<string, Record<string, unknown>>
)["__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"];
const originalDispatcher = reactInternals.H;
const originalFetch = globalThis.fetch;

function createHookHarness() {
  const state: unknown[] = [];
  const refs: Array<{ current: unknown }> = [];
  let cursor = 0;
  let refCursor = 0;

  reactInternals.H = {
    useState<T>(initialValue: T | (() => T)): [T, StateSetter<T>] {
      const index = cursor++;
      if (!(index in state)) {
        state[index] =
          typeof initialValue === "function"
            ? (initialValue as () => T)()
            : initialValue;
      }

      return [
        state[index] as T,
        (value) => {
          state[index] =
            typeof value === "function"
              ? (value as (previous: T) => T)(state[index] as T)
              : value;
        },
      ];
    },
    useCallback<T>(callback: T): T {
      return callback;
    },
    useRef<T>(initialValue: T): { current: T } {
      const index = refCursor++;
      refs[index] ??= { current: initialValue };
      return refs[index] as { current: T };
    },
    useEffect() {},
  };

  const HookProbe = () => {
    cursor = 0;
    refCursor = 0;
    return useSidebarData();
  };

  let current = HookProbe();
  return {
    get current(): HookResult {
      return current;
    },
    render() {
      current = HookProbe();
    },
  };
}

async function loadConfirmedDocument(
  harness: ReturnType<typeof createHookHarness>,
  overrides: Partial<HookResult["data"]["documents"][number]> = {},
  folders: HookResult["data"]["folders"] = []
) {
  const confirmedDocument: HookResult["data"]["documents"][number] = {
    id: "document-1",
    title: "Confirmed title",
    folderId: null,
    createdAt: "2026-08-06T00:00:00.000Z",
    updatedAt: "2026-08-06T00:00:00.000Z",
    ...overrides,
  };
  globalThis.fetch = mock(async (input: string | URL | Request) =>
    String(input).endsWith("/api/folders")
      ? Response.json(folders)
      : Response.json([confirmedDocument])
  ) as unknown as typeof fetch;

  await harness.current.refresh();
  harness.render();
  return confirmedDocument;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  reactInternals.H = originalDispatcher;
});

describe("useSidebarData confirmed state", () => {
  test("a failed rename rolls its optimistic title back", async () => {
    const harness = createHookHarness();
    const confirmedDocument = await loadConfirmedDocument(harness);
    let finishRequest: (response: Response) => void = () => {};
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishRequest = resolve;
        })
    ) as unknown as typeof fetch;

    const mutation = harness.current.renameDocument(
      confirmedDocument.id,
      "Optimistic title"
    );
    harness.render();
    expect(harness.current.data.documents[0]?.title).toBe("Optimistic title");

    await Promise.resolve();
    finishRequest(new Response(null, { status: 500 }));
    expect(await mutation).toBe(false);
    harness.render();
    expect(harness.current.data.documents[0]?.title).toBe("Confirmed title");
  });

  test("a failed delete restores the optimistically removed Document", async () => {
    const harness = createHookHarness();
    const confirmedDocument = await loadConfirmedDocument(harness);
    let finishRequest: (response: Response) => void = () => {};
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishRequest = resolve;
        })
    ) as unknown as typeof fetch;

    const mutation = harness.current.deleteDocument(confirmedDocument.id);
    harness.render();
    expect(harness.current.data.documents).toEqual([]);

    await Promise.resolve();
    finishRequest(new Response(null, { status: 500 }));
    expect(await mutation).toBe(false);
    harness.render();
    expect(harness.current.data.documents).toEqual([confirmedDocument]);
  });

  test("an older failed rename cannot replace a newer confirmed title", async () => {
    const harness = createHookHarness();
    const confirmedDocument = await loadConfirmedDocument(harness);
    const finishRequests: Array<(response: Response) => void> = [];
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishRequests.push(resolve);
        })
    ) as unknown as typeof fetch;

    const olderMutation = harness.current.renameDocument(
      confirmedDocument.id,
      "Older title"
    );
    harness.render();
    const newerMutation = harness.current.renameDocument(
      confirmedDocument.id,
      "Newest title"
    );
    harness.render();

    await Promise.resolve();
    expect(finishRequests).toHaveLength(1);
    finishRequests[0]?.(new Response(null, { status: 500 }));
    expect(await olderMutation).toBe(false);
    await Promise.resolve();
    finishRequests[1]?.(
      Response.json({ ...confirmedDocument, title: "Newest title" })
    );
    expect(await newerMutation).toBe(true);
    harness.render();

    expect(harness.current.data.documents[0]?.title).toBe("Newest title");
  });

  test("a failed rename retains the folder from the last confirmed move", async () => {
    const harness = createHookHarness();
    const confirmedDocument = await loadConfirmedDocument(harness);
    globalThis.fetch = mock(
      async () => new Response(null, { status: 200 })
    ) as unknown as typeof fetch;

    await harness.current.moveDocument(confirmedDocument.id, "folder-1");
    harness.render();
    expect(harness.current.data.documents[0]?.folderId).toBe("folder-1");

    let finishRename: (response: Response) => void = () => {};
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishRename = resolve;
        })
    ) as unknown as typeof fetch;
    const rename = harness.current.renameDocument(
      confirmedDocument.id,
      "Unconfirmed title"
    );
    await Promise.resolve();
    finishRename(new Response(null, { status: 500 }));

    expect(await rename).toBe(false);
    harness.render();
    expect(harness.current.data.documents[0]).toEqual({
      ...confirmedDocument,
      folderId: "folder-1",
    });
  });

  test("a failed rename retains the root location confirmed by Folder deletion", async () => {
    const harness = createHookHarness();
    const confirmedDocument = await loadConfirmedDocument(
      harness,
      { folderId: "folder-1" },
      [
        {
          id: "folder-1",
          name: "Folder",
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z",
        },
      ]
    );
    globalThis.fetch = mock(
      async () => new Response(null, { status: 204 })
    ) as unknown as typeof fetch;

    await harness.current.deleteFolder("folder-1");
    harness.render();
    expect(harness.current.data.documents[0]?.folderId).toBeNull();

    let finishRename: (response: Response) => void = () => {};
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishRename = resolve;
        })
    ) as unknown as typeof fetch;
    const rename = harness.current.renameDocument(
      confirmedDocument.id,
      "Unconfirmed title"
    );
    await Promise.resolve();
    finishRename(new Response(null, { status: 500 }));

    expect(await rename).toBe(false);
    harness.render();
    expect(harness.current.data.documents[0]).toEqual({
      ...confirmedDocument,
      folderId: null,
    });
  });

  test("a move completing after rename preserves both confirmed changes", async () => {
    const harness = createHookHarness();
    const confirmedDocument = await loadConfirmedDocument(harness);
    const finishRequests: Array<(response: Response) => void> = [];
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishRequests.push(resolve);
        })
    ) as unknown as typeof fetch;

    const rename = harness.current.renameDocument(
      confirmedDocument.id,
      "Confirmed rename"
    );
    await Promise.resolve();
    const move = harness.current.moveDocument(confirmedDocument.id, "folder-1");
    expect(finishRequests).toHaveLength(1);

    finishRequests[0]?.(
      Response.json({ ...confirmedDocument, title: "Confirmed rename" })
    );
    expect(await rename).toBe(true);
    await Promise.resolve();
    finishRequests[1]?.(new Response(null, { status: 200 }));
    await move;
    harness.render();

    let finishFailedRename: (response: Response) => void = () => {};
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishFailedRename = resolve;
        })
    ) as unknown as typeof fetch;
    const failedRename = harness.current.renameDocument(
      confirmedDocument.id,
      "Unconfirmed title"
    );
    await Promise.resolve();
    finishFailedRename(new Response(null, { status: 500 }));

    expect(await failedRename).toBe(false);
    harness.render();
    expect(harness.current.data.documents[0]).toEqual({
      ...confirmedDocument,
      title: "Confirmed rename",
      folderId: "folder-1",
    });
  });

  test("a failed delete restores a move that was confirmed first", async () => {
    const harness = createHookHarness();
    const confirmedDocument = await loadConfirmedDocument(harness);
    const finishRequests: Array<(response: Response) => void> = [];
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          finishRequests.push(resolve);
        })
    ) as unknown as typeof fetch;

    const move = harness.current.moveDocument(confirmedDocument.id, "folder-1");
    const deletion = harness.current.deleteDocument(confirmedDocument.id);
    await Promise.resolve();
    expect(finishRequests).toHaveLength(1);

    finishRequests[0]?.(new Response(null, { status: 200 }));
    await move;
    await Promise.resolve();
    finishRequests[1]?.(new Response(null, { status: 500 }));
    expect(await deletion).toBe(false);
    harness.render();

    expect(harness.current.data.documents[0]).toEqual({
      ...confirmedDocument,
      folderId: "folder-1",
    });
  });
});
