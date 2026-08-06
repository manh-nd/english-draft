import { describe, expect, test } from "bun:test";
import type { SidebarDocument } from "@/hooks/use-sidebar-data";
import {
  documentSearchReducer,
  initialDocumentSearchState,
  selectSidebarDocuments,
} from "@/hooks/use-document-search";

const treeDocument: SidebarDocument = {
  id: "tree-document",
  title: "Tree document",
  folderId: null,
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z",
};

const matchingDocument: SidebarDocument = {
  ...treeDocument,
  id: "matching-document",
  title: "A title that does not contain the query",
};

describe("Document sidebar search state", () => {
  test("clearing search immediately restores the normal tree", () => {
    const searching = documentSearchReducer(initialDocumentSearchState, {
      type: "start",
      requestId: 1,
      query: "grammar",
    });
    const results = documentSearchReducer(searching, {
      type: "success",
      requestId: 1,
      query: "grammar",
      documents: [matchingDocument],
    });
    const cleared = documentSearchReducer(results, {
      type: "clear",
      requestId: 2,
    });
    const afterLateResponse = documentSearchReducer(cleared, {
      type: "success",
      requestId: 1,
      query: "grammar",
      documents: [matchingDocument],
    });

    expect(afterLateResponse).toBe(cleared);
    expect(selectSidebarDocuments([treeDocument], "", cleared)).toEqual([
      treeDocument,
    ]);
  });

  test("an older response cannot replace results for a newer query", () => {
    const searchingNewQuery = documentSearchReducer(
      initialDocumentSearchState,
      { type: "start", requestId: 2, query: "new" }
    );
    const afterOldResponse = documentSearchReducer(searchingNewQuery, {
      type: "success",
      requestId: 1,
      query: "old",
      documents: [treeDocument],
    });
    const afterNewResponse = documentSearchReducer(afterOldResponse, {
      type: "success",
      requestId: 2,
      query: "new",
      documents: [matchingDocument],
    });

    expect(afterOldResponse).toBe(searchingNewQuery);
    expect(
      selectSidebarDocuments([treeDocument], "new", afterNewResponse)
    ).toEqual([matchingDocument]);
  });

  test("loading and errors retain the existing tree", () => {
    const loading = documentSearchReducer(initialDocumentSearchState, {
      type: "start",
      requestId: 1,
      query: "draft",
    });
    const failed = documentSearchReducer(loading, {
      type: "error",
      requestId: 1,
      query: "draft",
      message: "Search failed",
    });

    expect(selectSidebarDocuments([treeDocument], "draft", loading)).toEqual([
      treeDocument,
    ]);
    expect(selectSidebarDocuments([treeDocument], "draft", failed)).toEqual([
      treeDocument,
    ]);
  });
});
