"use client";

import { useState } from "react";
import { FileText, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import TiptapEditor from "@/components/editor/tiptap-editor";
import { SidePanel } from "@/components/editor/side-panel";

interface DocumentViewProps {
  documentId: string;
  documentTitle: string;
  documentUpdatedAt: string;
  initialContent: Record<string, unknown> | null;
}

export function DocumentView({
  documentId,
  documentTitle,
  documentUpdatedAt,
  initialContent,
}: DocumentViewProps) {
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(documentUpdatedAt));

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Editor area */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Document header */}
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {documentTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Last edited {formattedDate}
            </p>
          </div>
          {/* Side panel toggle */}
          <Button
            variant={sidePanelOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSidePanelOpen((open) => !open)}
            aria-label={
              sidePanelOpen ? "Close AI Assistant" : "Open AI Assistant"
            }
            aria-expanded={sidePanelOpen}
          >
            <Bot className="size-4" />
            <span className="ml-1.5 hidden sm:inline">AI Assistant</span>
          </Button>
        </div>

        {/* Tiptap Editor */}
        <TiptapEditor documentId={documentId} initialContent={initialContent} />
      </div>

      {/* Side Panel */}
      <SidePanel
        documentId={documentId}
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
      />
    </div>
  );
}
