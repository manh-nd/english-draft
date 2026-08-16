"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import TiptapEditor from "@/components/editor/tiptap-editor";
import { SidePanel } from "@/components/editor/side-panel";
import {
  DocumentHeader,
  type DocumentHeaderFolder,
} from "@/components/editor/document-header";
import { DocumentStatusBar } from "@/components/editor/document-status-bar";

interface DocumentViewProps {
  documentId: string;
  documentTitle: string;
  documentFolderId: string | null;
  folders: DocumentHeaderFolder[];
  documentUpdatedAt: string;
  initialContent: Record<string, unknown> | null;
  initialTextContent?: string;
}

export function DocumentView({
  documentId,
  documentTitle,
  documentFolderId,
  folders,
  documentUpdatedAt,
  initialContent,
  initialTextContent = "",
}: DocumentViewProps) {
  const router = useRouter();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle"
  );
  const [textContent, setTextContent] = useState(initialTextContent);
  const [wordCount, setWordCount] = useState(() => {
    const trimmed = initialTextContent.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  });

  /** Listen for Cmd+J / Ctrl+J to toggle Side Panel */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setSidePanelOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /** Called from the editor's "Ask AI" bubble-menu action. Opens the panel
   *  and pre-fills the selected-text context banner. */
  const handleAskAi = useCallback((text: string) => {
    setSelectedText(text);
    setSidePanelOpen(true);
  }, []);

  const handleContentUpdate = useCallback(
    ({ text, wordCount: count }: { text: string; wordCount: number }) => {
      setTextContent(text);
      setWordCount(count);
    },
    []
  );

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      try {
        setSaveStatus("saving");
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          router.refresh();
          return true;
        }
      } catch {
        // Ignore network errors
      }
      return false;
    },
    [documentId, router]
  );

  const handleFolderChange = useCallback(
    async (newFolderId: string | null) => {
      try {
        setSaveStatus("saving");
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: newFolderId }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          router.refresh();
          return true;
        }
      } catch {
        // Ignore network errors
      }
      return false;
    },
    [documentId, router]
  );

  const handleExportMarkdown = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textContent);
    }
  }, [textContent]);

  const handleExportPlainText = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textContent);
    }
  }, [textContent]);

  const handleScanDocument = useCallback(() => {
    setSelectedText(null);
    setSidePanelOpen(true);
  }, []);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background">
      {/* Editor Main Container */}
      <div className="relative flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-6 lg:px-12 flex flex-col gap-6 flex-1">
          {/* Enhanced Minimalist Document Header */}
          <DocumentHeader
            documentId={documentId}
            initialTitle={documentTitle}
            initialFolderId={documentFolderId}
            folders={folders}
            updatedAt={documentUpdatedAt}
            saveStatus={saveStatus}
            wordCount={wordCount}
            sidePanelOpen={sidePanelOpen}
            onToggleSidePanel={() => setSidePanelOpen((open) => !open)}
            onScanDocument={handleScanDocument}
            onExportMarkdown={handleExportMarkdown}
            onExportPlainText={handleExportPlainText}
            onTitleChange={handleTitleChange}
            onFolderChange={handleFolderChange}
          />

          {/* Tiptap Editor */}
          <div className="min-h-[60vh] focus-within:outline-none pb-12">
            <TiptapEditor
              documentId={documentId}
              initialContent={initialContent}
              onAskAi={handleAskAi}
              onContentUpdate={handleContentUpdate}
              onSaveStatusChange={setSaveStatus}
            />
          </div>
        </div>

        {/* Subtle Status Bar (Adaptive Focus) */}
        <div className="sticky bottom-4 z-10 flex justify-end px-6 lg:px-12 pointer-events-none mt-auto pb-2">
          <DocumentStatusBar
            wordCount={wordCount}
            characterCount={textContent.length}
            className="pointer-events-auto"
          />
        </div>
      </div>

      {/* AI Side Panel */}
      <SidePanel
        documentId={documentId}
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        selectedText={selectedText}
        onClearSelectedText={() => setSelectedText(null)}
      />
    </div>
  );
}
