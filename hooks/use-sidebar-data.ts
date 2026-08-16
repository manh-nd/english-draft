"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  const confirmedDocuments = useRef(new Map<string, SidebarDocument>());
  const documentMutationVersions = useRef(new Map<string, number>());
  const documentMutationQueues = useRef(new Map<string, Promise<void>>());

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

      confirmedDocuments.current = new Map(
        documents.map((document) => [document.id, document])
      );
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

  const nextDocumentMutationVersion = useCallback((id: string) => {
    const version = (documentMutationVersions.current.get(id) ?? 0) + 1;
    documentMutationVersions.current.set(id, version);
    return version;
  }, []);

  const enqueueDocumentMutation = useCallback(
    async <T>(id: string, mutation: () => Promise<T>): Promise<T> => {
      const previous = documentMutationQueues.current.get(id);
      const result = (previous ?? Promise.resolve()).then(mutation);
      const settled = result.then(
        () => undefined,
        () => undefined
      );
      documentMutationQueues.current.set(id, settled);

      try {
        return await result;
      } finally {
        if (documentMutationQueues.current.get(id) === settled) {
          documentMutationQueues.current.delete(id);
        }
      }
    },
    []
  );

  const rollbackDocumentMutationIfCurrent = useCallback(
    (
      id: string,
      version: number,
      fallbackDocument: SidebarDocument | undefined
    ) => {
      if (documentMutationVersions.current.get(id) !== version) return;

      const rollbackDocument =
        confirmedDocuments.current.get(id) ?? fallbackDocument;
      if (!rollbackDocument) return;

      setData((prev) => ({
        ...prev,
        documents: prev.documents.map((document) =>
          document.id === id ? rollbackDocument : document
        ),
      }));
    },
    []
  );

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createDocument = useCallback(
    async (
      folderId?: string | null,
      initial?: {
        title?: string;
        content?: Record<string, unknown>;
        textContent?: string;
      }
    ): Promise<SidebarDocument | null> => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: folderId ?? null,
          title: initial?.title,
          content: initial?.content,
          textContent: initial?.textContent,
        }),
      });
      if (!res.ok) return null;
      const doc: SidebarDocument = await res.json();
      // Optimistic update
      setData((prev) => ({
        ...prev,
        documents: [doc, ...prev.documents],
      }));
      confirmedDocuments.current.set(doc.id, doc);
      return doc;
    },
    []
  );

  const renameDocument = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      const version = nextDocumentMutationVersion(id);
      const initialConfirmedDocument =
        confirmedDocuments.current.get(id) ??
        data.documents.find((document) => document.id === id);
      setData((prev) => ({
        ...prev,
        documents: prev.documents.map((document) =>
          document.id === id ? { ...document, title } : document
        ),
      }));

      return enqueueDocumentMutation(id, async () => {
        try {
          const res = await fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          if (!res.ok) throw new Error("Failed to update Document");

          const savedDocument = (await res.json()) as SidebarDocument;
          confirmedDocuments.current.set(id, savedDocument);
          if (documentMutationVersions.current.get(id) === version) {
            setData((prev) => ({
              ...prev,
              documents: prev.documents.map((document) =>
                document.id === id ? savedDocument : document
              ),
            }));
          }
          return true;
        } catch (err) {
          rollbackDocumentMutationIfCurrent(
            id,
            version,
            initialConfirmedDocument
          );
          console.error(
            "[useSidebarData]",
            err instanceof Error ? err.message : "Failed to update Document"
          );
          return false;
        }
      });
    },
    [
      data.documents,
      enqueueDocumentMutation,
      nextDocumentMutationVersion,
      rollbackDocumentMutationIfCurrent,
    ]
  );

  const moveDocument = useCallback(
    async (id: string, folderId: string | null): Promise<void> => {
      const version = nextDocumentMutationVersion(id);
      const initialConfirmedDocument =
        confirmedDocuments.current.get(id) ??
        data.documents.find((document) => document.id === id);
      setData((prev) => ({
        ...prev,
        documents: prev.documents.map((document) =>
          document.id === id ? { ...document, folderId } : document
        ),
      }));

      await enqueueDocumentMutation(id, async () => {
        try {
          const res = await fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId }),
          });
          if (!res.ok) throw new Error("Failed to move Document");

          const latestConfirmedDocument =
            confirmedDocuments.current.get(id) ?? initialConfirmedDocument;
          if (latestConfirmedDocument) {
            confirmedDocuments.current.set(id, {
              ...latestConfirmedDocument,
              folderId,
            });
          }
          if (documentMutationVersions.current.get(id) === version) {
            setData((prev) => ({
              ...prev,
              documents: prev.documents.map((document) =>
                document.id === id ? { ...document, folderId } : document
              ),
            }));
          }
        } catch (err) {
          rollbackDocumentMutationIfCurrent(
            id,
            version,
            initialConfirmedDocument
          );
          console.error(
            "[useSidebarData]",
            err instanceof Error ? err.message : "Failed to move Document"
          );
        }
      });
    },
    [
      data.documents,
      enqueueDocumentMutation,
      nextDocumentMutationVersion,
      rollbackDocumentMutationIfCurrent,
    ]
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      const version = nextDocumentMutationVersion(id);
      const confirmedIndex = data.documents.findIndex((d) => d.id === id);
      const initialConfirmedDocument =
        confirmedDocuments.current.get(id) ?? data.documents[confirmedIndex];
      // Optimistic update
      setData((prev) => ({
        ...prev,
        documents: prev.documents.filter((d) => d.id !== id),
      }));

      return enqueueDocumentMutation(id, async () => {
        try {
          const res = await fetch(`/api/documents/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete Document");
          confirmedDocuments.current.delete(id);
          return true;
        } catch (err) {
          if (documentMutationVersions.current.get(id) === version) {
            const rollbackDocument =
              confirmedDocuments.current.get(id) ?? initialConfirmedDocument;
            if (rollbackDocument) {
              setData((prev) => {
                if (prev.documents.some((document) => document.id === id)) {
                  return prev;
                }
                const documents = [...prev.documents];
                documents.splice(confirmedIndex, 0, rollbackDocument);
                return { ...prev, documents };
              });
            }
          }
          console.error(
            "[useSidebarData]",
            err instanceof Error ? err.message : "Failed to delete Document"
          );
          return false;
        }
      });
    },
    [data.documents, enqueueDocumentMutation, nextDocumentMutationVersion]
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
      if (!res.ok) {
        await refresh();
        return;
      }
      for (const [documentId, document] of confirmedDocuments.current) {
        if (document.folderId === id) {
          confirmedDocuments.current.set(documentId, {
            ...document,
            folderId: null,
          });
        }
      }
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
