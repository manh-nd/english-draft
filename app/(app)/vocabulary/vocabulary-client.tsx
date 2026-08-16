"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Trash2, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { VocabularyItemWithDocument } from "@/lib/db/vocabulary";

interface VocabularyClientProps {
  initialItems: VocabularyItemWithDocument[];
}

export function VocabularyClient({ initialItems }: VocabularyClientProps) {
  const [items, setItems] =
    useState<VocabularyItemWithDocument[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const setIdPending = (id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDelete = useCallback(async (id: string) => {
    setIdPending(id, true);
    try {
      const res = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setIdPending(id, false);
    }
  }, []);

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>No vocabulary items yet</EmptyTitle>
          <EmptyDescription>
            Select a word or phrase in the editor and click &apos;Save
            vocab&apos; to add it here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isPending = pendingIds.has(item.id);
        return (
          <li
            key={item.id}
            className="group flex items-start gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex-1 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{item.phrase}</span>
                <span className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(item.createdAt))}
                </span>
                {item.documentId && item.documentTitle && (
                  <Link
                    href={`/documents/${item.documentId}`}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <FileText className="size-3" />
                    {item.documentTitle}
                  </Link>
                )}
              </div>
              {item.definition && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.definition}
                </p>
              )}
              {item.exampleSentence && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  &ldquo;{item.exampleSentence}&rdquo;
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              disabled={isPending}
              onClick={() => handleDelete(item.id)}
              aria-label={`Delete ${item.phrase}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
