"use client";

import { useEffect, useReducer, useRef } from "react";
import type { SidebarDocument } from "@/hooks/use-sidebar-data";

export type DocumentSearchState = {
  requestId: number;
  query: string;
  documents: SidebarDocument[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
};

type DocumentSearchAction =
  | { type: "clear"; requestId: number }
  | { type: "start"; requestId: number; query: string }
  | {
      type: "success";
      requestId: number;
      query: string;
      documents: SidebarDocument[];
    }
  | {
      type: "error";
      requestId: number;
      query: string;
      message: string;
    };

export const initialDocumentSearchState: DocumentSearchState = {
  requestId: 0,
  query: "",
  documents: [],
  status: "idle",
  error: null,
};

export function documentSearchReducer(
  state: DocumentSearchState,
  action: DocumentSearchAction
): DocumentSearchState {
  if (action.type === "clear") {
    return { ...initialDocumentSearchState, requestId: action.requestId };
  }

  if (action.type === "start") {
    return {
      requestId: action.requestId,
      query: action.query,
      documents: [],
      status: "loading",
      error: null,
    };
  }

  if (action.requestId !== state.requestId) return state;

  if (action.type === "success") {
    return {
      requestId: action.requestId,
      query: action.query,
      documents: action.documents,
      status: "success",
      error: null,
    };
  }

  return {
    requestId: action.requestId,
    query: action.query,
    documents: [],
    status: "error",
    error: action.message,
  };
}

export function selectSidebarDocuments(
  treeDocuments: SidebarDocument[],
  visibleQuery: string,
  search: DocumentSearchState
): SidebarDocument[] {
  const query = visibleQuery.trim();
  return query && search.status === "success" && search.query === query
    ? search.documents
    : treeDocuments;
}

export function useDocumentSearch(query: string): DocumentSearchState {
  const [state, dispatch] = useReducer(
    documentSearchReducer,
    initialDocumentSearchState
  );
  const latestRequestId = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const requestId = ++latestRequestId.current;
    const controller = new AbortController();

    if (!normalizedQuery) {
      dispatch({ type: "clear", requestId });
      return () => controller.abort();
    }

    const timer = window.setTimeout(async () => {
      dispatch({ type: "start", requestId, query: normalizedQuery });

      try {
        const response = await fetch(
          `/api/documents?q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Document search failed");

        const documents = (await response.json()) as SidebarDocument[];
        dispatch({
          type: "success",
          requestId,
          query: normalizedQuery,
          documents,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          type: "error",
          requestId,
          query: normalizedQuery,
          message: error instanceof Error ? error.message : "Search failed",
        });
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return state;
}
