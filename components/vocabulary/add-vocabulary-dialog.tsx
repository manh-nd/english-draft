"use client";

import { useState } from "react";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { VocabularyItemWithDocument } from "@/lib/db/vocabulary";

interface AddVocabularyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: (item: VocabularyItemWithDocument) => void;
}

export function AddVocabularyDialog({
  open,
  onOpenChange,
  onItemAdded,
}: AddVocabularyDialogProps) {
  const [phrase, setPhrase] = useState("");
  const [definition, setDefinition] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) {
      setError("Please enter a word or phrase.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: phrase.trim(),
          definition: definition.trim() || null,
          exampleSentence: exampleSentence.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to save vocabulary item");
      }

      const created = (await res.json()) as VocabularyItemWithDocument;
      onItemAdded({ ...created, documentTitle: null });
      setPhrase("");
      setDefinition("");
      setExampleSentence("");
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add vocabulary");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <DialogTitle>Add Vocabulary Item</DialogTitle>
                <DialogDescription className="text-xs">
                  Save a new word or phrase to schedule in your Spaced
                  Repetition queue.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            {/* Phrase */}
            <div className="grid gap-1.5">
              <label htmlFor="vocab-phrase" className="text-xs font-semibold">
                Word or Phrase <span className="text-destructive">*</span>
              </label>
              <Input
                id="vocab-phrase"
                placeholder="e.g. comprehensive, touch base, look forward to"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Definition */}
            <div className="grid gap-1.5">
              <label
                htmlFor="vocab-definition"
                className="text-xs font-semibold"
              >
                Definition & Phonetics
              </label>
              <Input
                id="vocab-definition"
                placeholder="e.g. /ˌkɒm.prɪˈhen.sɪv/ (adj.) Complete and including everything • Toàn diện"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: Include IPA `/.../`, POS `(n.)/(adj.)`, or `•` for
                Vietnamese translation.
              </p>
            </div>

            {/* Example sentence */}
            <div className="grid gap-1.5">
              <label htmlFor="vocab-example" className="text-xs font-semibold">
                Context / Example Sentence
              </label>
              <Textarea
                id="vocab-example"
                placeholder="e.g. We conducted a comprehensive review of the codebase before launching."
                value={exampleSentence}
                onChange={(e) => setExampleSentence(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 size-3.5" />
                  Save Word
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
