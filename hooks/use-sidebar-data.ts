"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SidebarFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SidebarDocument {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SidebarData {
  folders: SidebarFolder[];
  documents: SidebarDocument[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSidebarData() {
  const [data, setData] = useState<SidebarData>({ folders: [], documents: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [foldersRes, docsRes] = await Promise.all([
        fetch("/api/folders"),
        fetch("/api/documents"),
      ]);

      if (!foldersRes.ok || !docsRes.ok) {
        throw new Error("Failed to fetch sidebar data");
      }

      const [folders, documents] = await Promise.all([
        foldersRes.json() as Promise<SidebarFolder[]>,
        docsRes.json() as Promise<SidebarDocument[]>,
      ]);

      setData({ folders, documents });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("[useSidebarData]", message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- refresh() is async: it awaits
     fetch() before calling setState, so this is not synchronous setState in an effect. */
  useEffect(() => {
    refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** PATCH /api/documents/:id with a partial update. Reverts on API error. */
  const patchDocument = useCallback(
    async (
      id: string,
      optimisticUpdate: (d: SidebarDocument) => SidebarDocument,
      body: object
    ): Promise<void> => {
      setData((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === id ? optimisticUpdate(d) : d
        ),
      }));
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) await refresh();
    },
    [refresh]
  );

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createDocument = useCallback(
    async (folderId?: string | null): Promise<SidebarDocument | null> => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId ?? null }),
      });
      if (!res.ok) return null;
      const doc: SidebarDocument = await res.json();
      // Optimistic update
      setData((prev) => ({
        ...prev,
        documents: [doc, ...prev.documents],
      }));
      return doc;
    },
    []
  );

  const renameDocument = useCallback(
    async (id: string, title: string): Promise<void> => {
      await patchDocument(id, (d) => ({ ...d, title }), { title });
    },
    [patchDocument]
  );

  const moveDocument = useCallback(
    async (id: string, folderId: string | null): Promise<void> => {
      await patchDocument(id, (d) => ({ ...d, folderId }), { folderId });
    },
    [patchDocument]
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update
      setData((prev) => ({
        ...prev,
        documents: prev.documents.filter((d) => d.id !== id),
      }));
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) await refresh(); // revert on error
    },
    [refresh]
  );

  const createFolder = useCallback(
    async (name: string): Promise<SidebarFolder | null> => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const folder: SidebarFolder = await res.json();
      setData((prev) => ({
        ...prev,
        folders: [...prev.folders, folder].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
      return folder;
    },
    []
  );

  const renameFolder = useCallback(
    async (id: string, name: string): Promise<void> => {
      setData((prev) => ({
        ...prev,
        folders: prev.folders
          .map((f) => (f.id === id ? { ...f, name } : f))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
      const res = await fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) await refresh();
    },
    [refresh]
  );

  const deleteFolder = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic: move documents to root, remove folder
      setData((prev) => ({
        folders: prev.folders.filter((f) => f.id !== id),
        documents: prev.documents.map((d) =>
          d.folderId === id ? { ...d, folderId: null } : d
        ),
      }));
      const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
      if (!res.ok) await refresh();
    },
    [refresh]
  );

  return {
    data,
    isLoading,
    error,
    refresh,
    createDocument,
    renameDocument,
    moveDocument,
    deleteDocument,
    createFolder,
    renameFolder,
    deleteFolder,
  };
}
