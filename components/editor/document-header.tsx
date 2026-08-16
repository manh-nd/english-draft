"use client";

import { useState, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Printer,
  Bot,
  FileText,
  Clock,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DocumentHeaderFolder {
  id: string;
  name: string;
}

export interface DocumentHeaderProps {
  documentId?: string;
  initialTitle: string;
  initialFolderId: string | null;
  folders: DocumentHeaderFolder[];
  updatedAt: string;
  saveStatus: "saved" | "saving" | "idle";
  wordCount: number;
  sidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  onScanDocument: () => void;
  onExportMarkdown: () => void;
  onExportPlainText: () => void;
  onTitleChange: (newTitle: string) => Promise<boolean> | boolean;
  onFolderChange: (newFolderId: string | null) => Promise<boolean> | boolean;
}

export function DocumentHeader({
  initialTitle,
  initialFolderId,
  folders,
  updatedAt,
  saveStatus,
  wordCount,
  sidePanelOpen,
  onToggleSidePanel,
  onScanDocument,
  onExportMarkdown,
  onExportPlainText,
  onTitleChange,
  onFolderChange,
}: DocumentHeaderProps) {
  const [title, setTitle] = useState(initialTitle || "Untitled");
  const [prevInitialTitle, setPrevInitialTitle] = useState(initialTitle);
  if (initialTitle !== prevInitialTitle) {
    setPrevInitialTitle(initialTitle);
    setTitle(initialTitle || "Untitled");
  }

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    initialFolderId
  );
  const [prevInitialFolderId, setPrevInitialFolderId] =
    useState(initialFolderId);
  if (initialFolderId !== prevInitialFolderId) {
    setPrevInitialFolderId(initialFolderId);
    setCurrentFolderId(initialFolderId);
  }

  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  const handleTitleCommit = useCallback(async () => {
    const trimmed = title.trim() || "Untitled";
    setTitle(trimmed);
    if (trimmed !== initialTitle) {
      await onTitleChange(trimmed);
    }
  }, [title, initialTitle, onTitleChange]);

  const handleFolderSelect = useCallback(
    async (folderId: string | null) => {
      setCurrentFolderId(folderId);
      await onFolderChange(folderId);
    },
    [onFolderChange]
  );

  const handleCopyMarkdown = useCallback(() => {
    onExportMarkdown();
    setCopiedStatus("Markdown copied!");
    setTimeout(() => setCopiedStatus(null), 2000);
  }, [onExportMarkdown]);

  const handleCopyPlainText = useCallback(() => {
    onExportPlainText();
    setCopiedStatus("Plain text copied!");
    setTimeout(() => setCopiedStatus(null), 2000);
  }, [onExportPlainText]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(updatedAt));

  return (
    <TooltipProvider>
      <header className="flex flex-col gap-3 border-b bg-background/80 pb-4 pt-1 backdrop-blur-sm">
        {/* Top bar: Breadcrumbs & Meta & Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Breadcrumbs & Folder Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
            >
              <FileText className="size-3.5" />
              <span>Documents</span>
            </Link>

            <ChevronRight className="size-3.5 text-muted-foreground/50" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Folder className="size-3.5 text-muted-foreground" />
                  <span className="max-w-[120px] truncate sm:max-w-[180px]">
                    {currentFolder ? currentFolder.name : "No folder"}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                  Move to folder
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleFolderSelect(null)}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="size-3.5 text-muted-foreground" />
                    <span>No folder (Root)</span>
                  </div>
                  {currentFolderId === null && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
                {folders.length > 0 && <DropdownMenuSeparator />}
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => handleFolderSelect(folder.id)}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="size-3.5 text-muted-foreground" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    {currentFolderId === folder.id && (
                      <Check className="size-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* Word count & Reading time */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground sm:flex cursor-default">
                  <Clock className="size-3" />
                  <span>{wordCount} words</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>~{readingTimeMinutes} min</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Last edited {formattedDate}
              </TooltipContent>
            </Tooltip>

            {/* Save status badge */}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-1">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  <span className="hidden md:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden md:inline">Saved</span>
                </>
              )}
            </div>

            {/* AI Review / Scan Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onScanDocument}
                  className="h-8 gap-1.5 px-2.5 text-xs font-medium"
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span className="hidden sm:inline">AI Review</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Scan entire document for grammar and vocabulary improvements
              </TooltipContent>
            </Tooltip>

            {/* Export Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-8"
                      aria-label="Export document"
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Export / Copy</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={handleCopyMarkdown}
                  className="text-xs"
                >
                  <Copy className="size-3.5 mr-2" />
                  <span>Copy Markdown</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyPlainText}
                  className="text-xs"
                >
                  <FileText className="size-3.5 mr-2" />
                  <span>Copy Plain Text</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePrint} className="text-xs">
                  <Printer className="size-3.5 mr-2" />
                  <span>Print / PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Side Panel Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={sidePanelOpen ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleSidePanel}
                  className="h-8 gap-1.5 px-2.5 text-xs font-medium"
                  aria-label={
                    sidePanelOpen ? "Close AI Assistant" : "Open AI Assistant"
                  }
                  aria-expanded={sidePanelOpen}
                >
                  <Bot className="size-3.5" />
                  <span className="hidden md:inline">AI Assistant</span>
                  <kbd className="hidden lg:inline-block rounded bg-background/20 px-1 py-0.5 text-[9px] font-mono leading-none">
                    ⌘J
                  </kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Toggle AI Assistant (⌘J)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Inline Editable Document Title */}
        <div className="group relative">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                setTitle(initialTitle || "Untitled");
                e.currentTarget.blur();
              }
            }}
            placeholder="Untitled Document"
            className="w-full bg-transparent text-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/40 rounded px-1 -mx-1 transition-all py-0.5"
            aria-label="Document Title"
          />
          {copiedStatus && (
            <span className="absolute right-0 top-1 text-xs text-primary font-medium animate-in fade-in slide-in-from-top-1">
              {copiedStatus}
            </span>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
