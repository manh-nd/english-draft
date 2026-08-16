"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HeroLearningWidget } from "./hero-learning-widget";
import { QuickStartTemplates } from "./quick-start-templates";
import { RecentDocuments } from "./recent-documents";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { DocumentWithFolder } from "@/lib/db/documents";
import type { DocumentTemplate } from "@/lib/templates";
import { Sparkles, Command } from "lucide-react";

export interface DashboardClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  dueCount: number;
  totalVocabulary: number;
  totalCorrections: number;
  recentDocuments: DocumentWithFolder[];
}

function getGreeting(name: string): string {
  const firstName = name ? name.split(" ")[0] : "there";
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

export function DashboardClient({
  user,
  dueCount,
  totalVocabulary,
  totalCorrections,
  recentDocuments,
}: DashboardClientProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleCreateDocument = useCallback(
    async (template?: DocumentTemplate) => {
      setIsCreating(true);
      if (template) {
        setCreatingTemplateId(template.id);
      }
      setError(null);

      try {
        const payload = template
          ? {
              title:
                template.title === "Blank Document"
                  ? "Untitled"
                  : template.title,
              content: template.content,
              textContent: template.textContent,
            }
          : { title: "Untitled" };

        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to create document. Please try again.");
        }

        const doc = await res.json();
        router.push(`/documents/${doc.id}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create document";
        setError(message);
        setIsCreating(false);
        setCreatingTemplateId(null);
      }
    },
    [router]
  );

  const greeting = getGreeting(user.name);

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* ── Welcome Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-foreground">
              {greeting}
            </h1>
            <Badge
              variant="outline"
              className="gap-1 text-xs font-normal border-primary/20 text-primary"
            >
              <Sparkles className="size-3" /> Hybrid Workspace
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Draft with AI assistance, expand your vocabulary, and master English
            daily.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-1.5">
          <Command className="size-3.5" />
          <span>Press</span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
            ⌘K
          </kbd>
          <span>to search documents</span>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Hero Learning Widget ──────────────────────────────────── */}
      <HeroLearningWidget
        dueCount={dueCount}
        totalVocabulary={totalVocabulary}
        totalCorrections={totalCorrections}
      />

      {/* ── Quick Start Templates ─────────────────────────────────── */}
      <QuickStartTemplates
        onSelectTemplate={handleCreateDocument}
        isCreating={isCreating}
        creatingTemplateId={creatingTemplateId}
      />

      {/* ── Recent Documents ──────────────────────────────────────── */}
      <RecentDocuments
        documents={recentDocuments}
        onNewDocument={() => handleCreateDocument()}
        isCreating={isCreating}
      />
    </div>
  );
}
