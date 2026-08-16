"use client";

import {
  FileText,
  Folder,
  Plus,
  Clock,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DocumentWithFolder } from "@/lib/db/documents";

export interface RecentDocumentsProps {
  documents: DocumentWithFolder[];
  onNewDocument: () => void;
  isCreating?: boolean;
}

function formatRelativeTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function calculateReadingStats(textContent?: string | null) {
  if (!textContent) return { words: 0, readTimeMinutes: 1 };
  const trimmed = textContent.trim();
  if (!trimmed) return { words: 0, readTimeMinutes: 1 };
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
  return { words, readTimeMinutes };
}

export function RecentDocuments({
  documents,
  onNewDocument,
  isCreating = false,
}: RecentDocumentsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">
            Recent Documents
          </h2>
          {documents.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({documents.length})
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNewDocument}
          disabled={isCreating}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          New Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No documents drafted yet
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Pick a template from above or create a new blank document to
                begin drafting your English writing.
              </p>
            </div>
            <Button
              size="sm"
              onClick={onNewDocument}
              disabled={isCreating}
              className="mt-2 gap-1.5"
            >
              <Plus className="size-3.5" />
              Create your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const { words, readTimeMinutes } = calculateReadingStats(
              doc.textContent
            );
            const snippet = doc.textContent?.trim()
              ? doc.textContent.trim().slice(0, 140)
              : "Empty document…";

            return (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="group focus-visible:outline-none"
              >
                <Card className="h-full border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                    {/* Top Row: Title & Folder */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-1">
                          {doc.title || "Untitled"}
                        </h3>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>

                      {doc.folderName && (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[10px] font-normal text-muted-foreground"
                        >
                          <Folder className="size-3" />
                          <span className="truncate max-w-[120px]">
                            {doc.folderName}
                          </span>
                        </Badge>
                      )}

                      {/* Excerpt Snippet */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {snippet}
                      </p>
                    </div>

                    {/* Bottom Meta Row */}
                    <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{formatRelativeTime(doc.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{words} words</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <BookOpen className="size-3" />
                          {readTimeMinutes}m read
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
