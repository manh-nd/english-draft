"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  Check,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Printer,
  Bot,
  FileText,
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
  wordCount?: number;
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  // Auto-resize textarea height to match text content dynamically
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [title, adjustHeight]);

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
      <header className="flex flex-col gap-3 border-b border-border/40 pb-3 pt-1">
        {/* Top Navigation & Action Row */}
        <div className="flex items-center justify-between gap-3 text-xs">
          {/* Left: Breadcrumbs & Folder Selector */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium transition-colors shrink-0"
            >
              <FileText className="size-3.5" />
              <span>Documents</span>
            </Link>

            <span className="text-muted-foreground/40 shrink-0 select-none">
              /
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring truncate max-w-[180px] sm:max-w-[240px]"
                >
                  <Folder className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {currentFolder ? currentFolder.name : "No folder"}
                  </span>
                  <ChevronDown className="size-3 shrink-0 opacity-60" />
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

          {/* Right: Minimalist Actions (Save indicator, AI Review, Export, Assistant toggle) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Minimal Save Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[11px] text-muted-foreground cursor-default select-none">
                  {saveStatus === "saving" ? (
                    <>
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="hidden sm:inline">Saved</span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {saveStatus === "saving"
                  ? "Saving changes…"
                  : `All changes saved • Last edited ${formattedDate}`}
              </TooltipContent>
            </Tooltip>

            {/* AI Review / Scan Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onScanDocument}
                  className="h-7 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span className="hidden sm:inline">AI Review</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Scan entire document for grammar & vocabulary improvements
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
                      className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                  variant={sidePanelOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={onToggleSidePanel}
                  className={`h-7 gap-1.5 px-2 text-xs font-medium transition-colors ${
                    sidePanelOpen
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  aria-label={
                    sidePanelOpen ? "Close AI Assistant" : "Open AI Assistant"
                  }
                  aria-expanded={sidePanelOpen}
                >
                  <Bot className="size-3.5" />
                  <span className="hidden md:inline">Assistant</span>
                  <kbd className="hidden lg:inline-flex items-center rounded bg-muted px-1 py-0.2 text-[9px] font-mono text-muted-foreground border">
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

        {/* Auto-expanding Title Input */}
        <div className="group relative pt-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              adjustHeight();
            }}
            onBlur={handleTitleCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setTitle(initialTitle || "Untitled");
                e.currentTarget.blur();
              }
            }}
            placeholder="Untitled Document"
            className="w-full resize-none overflow-hidden bg-transparent text-3xl sm:text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/30 focus:outline-none border-0 p-0 focus-visible:ring-0 focus-visible:outline-none leading-tight"
            aria-label="Document Title"
          />
          {copiedStatus && (
            <span className="absolute right-0 top-0 text-xs text-primary font-medium animate-in fade-in slide-in-from-top-1 bg-background/80 px-2 py-0.5 rounded shadow-xs">
              {copiedStatus}
            </span>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
