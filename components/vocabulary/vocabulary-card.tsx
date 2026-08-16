"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Volume2,
  Trash2,
  FileText,
  Copy,
  Check,
  Clock,
  Sparkles,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  parseVocabularyDefinition,
  getSrsStatus,
  speakPhrase,
} from "@/lib/vocabulary-utils";
import type { VocabularyItemWithDocument } from "@/lib/db/vocabulary";

interface VocabularyCardProps {
  item: VocabularyItemWithDocument;
  isPending: boolean;
  onDelete: (id: string) => void;
}

const POS_BADGE_COLORS: Record<string, string> = {
  noun: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  verb: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  adjective:
    "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  adverb:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  idiom: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  phrase:
    "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  "phrasal verb":
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
};

/**
 * Highlights occurrences of the target phrase within an example sentence.
 */
function renderHighlightedSentence(sentence: string, targetPhrase: string) {
  if (!targetPhrase || !sentence) return sentence;

  const escaped = targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = sentence.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === targetPhrase.toLowerCase()) {
      return (
        <span
          key={index}
          className="rounded-xs bg-primary/15 px-1 py-0.5 font-semibold text-foreground dark:bg-primary/25 not-italic"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function VocabularyCard({
  item,
  isPending,
  onDelete,
}: VocabularyCardProps) {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const parsed = parseVocabularyDefinition(item.definition, item.phrase);
  const srsStatus = getSrsStatus(item.reviewItem);

  const handleAudioPlay = () => {
    setIsPlayingAudio(true);
    speakPhrase(item.phrase);
    setTimeout(() => setIsPlayingAudio(false), 1200);
  };

  const handleCopy = () => {
    const textToCopy = `${item.phrase}${parsed.ipa ? ` ${parsed.ipa}` : ""}${
      parsed.enDefinition ? ` - ${parsed.enDefinition}` : ""
    }${parsed.viDefinition ? ` (${parsed.viDefinition})` : ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(item.createdAt));

  const posColorClass =
    (parsed.partOfSpeech && POS_BADGE_COLORS[parsed.partOfSpeech]) ||
    "bg-muted text-muted-foreground border-border";

  return (
    <li className="group flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
      {/* Top Section: Word, Audio, Phonetic, POS, and Actions */}
      <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Word / Phrase */}
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {item.phrase}
            </h3>

            {/* Pronunciation Audio Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`size-7 rounded-full text-muted-foreground hover:text-primary transition-transform ${
                isPlayingAudio ? "scale-110 text-primary animate-pulse" : ""
              }`}
              onClick={handleAudioPlay}
              aria-label={`Pronounce ${item.phrase}`}
              title="Listen to pronunciation"
            >
              <Volume2 className="size-4" />
            </Button>

            {/* IPA Phonetic */}
            {parsed.ipa && (
              <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 select-all">
                {parsed.ipa}
              </span>
            )}

            {/* Part of Speech Badge */}
            {parsed.partOfSpeech && (
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold uppercase tracking-wider ${posColorClass}`}
              >
                {parsed.partOfSpeech}
              </Badge>
            )}
          </div>

          {/* Date & Source Document */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Added {formattedDate}</span>
            {item.documentId && item.documentTitle && (
              <Link
                href={`/documents/${item.documentId}`}
                className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Open source document"
              >
                <FileText className="size-3 shrink-0" />
                <span className="max-w-[140px] truncate sm:max-w-[200px]">
                  {item.documentTitle}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            aria-label="Copy word and definition"
            title={copied ? "Copied!" : "Copy word & definition"}
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-destructive"
            disabled={isPending}
            onClick={() => onDelete(item.id)}
            aria-label={`Delete ${item.phrase}`}
            title="Delete vocabulary item"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Middle Section: Bilingual Definition */}
      <div className="flex flex-col gap-1.5 text-xs sm:text-sm">
        {parsed.enDefinition && (
          <p className="font-medium text-foreground leading-relaxed">
            {parsed.enDefinition}
          </p>
        )}
        {parsed.viDefinition && (
          <p className="flex items-baseline gap-1.5 text-xs text-muted-foreground font-normal leading-relaxed">
            <span className="shrink-0 text-[11px] font-semibold uppercase text-primary/80">
              VN:
            </span>
            <span>{parsed.viDefinition}</span>
          </p>
        )}
      </div>

      {/* Example Sentence in context */}
      {item.exampleSentence && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground leading-relaxed">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
          <div className="italic">
            &ldquo;
            {renderHighlightedSentence(item.exampleSentence, item.phrase)}
            &rdquo;
          </div>
        </div>
      )}

      {/* Footer Section: SRS Review Status */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] font-medium ${srsStatus.badgeClass}`}
          >
            {srsStatus.isDue ? (
              <Clock className="mr-1 size-3" />
            ) : (
              <Sparkles className="mr-1 size-3" />
            )}
            {srsStatus.label}
          </Badge>
          <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
            {srsStatus.description}
          </span>
        </div>

        {srsStatus.isDue && (
          <Link
            href="/review"
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 underline-offset-2 hover:underline"
          >
            Practice now →
          </Link>
        )}
      </div>
    </li>
  );
}
