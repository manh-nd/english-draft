"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  ArrowRight,
  Bold,
  BookMarked,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Code,
  Highlighter,
  Italic,
  Languages,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  type InlineSuggestionAction,
  type InlineSuggestionRequest,
} from "@/lib/ai/inline-suggestions";

// ─── Highlight colour palette ─────────────────────────────────────────────────

interface HighlightColor {
  label: string;
  color: string;
  className: string;
}

const HIGHLIGHT_COLORS: HighlightColor[] = [
  {
    label: "Yellow — new word / phrase",
    color: "#FDE68A",
    className: "bg-yellow-200",
  },
  {
    label: "Green — correct / good",
    color: "#A7F3D0",
    className: "bg-emerald-200",
  },
  {
    label: "Blue — grammar note",
    color: "#BAE6FD",
    className: "bg-sky-200",
  },
  {
    label: "Pink — error area",
    color: "#FBCFE8",
    className: "bg-pink-200",
  },
  {
    label: "Purple — style note",
    color: "#DDD6FE",
    className: "bg-violet-200",
  },
];

export const INLINE_SUGGESTION_ACTIONS: Array<{
  action: InlineSuggestionAction;
  label: string;
  pendingLabel: string;
  description: string;
  icon: typeof Sparkles;
  errorType: "grammar" | "style" | "vocabulary";
  badgeVariant: "sky" | "violet" | "emerald";
}> = [
  {
    action: "fix-grammar",
    label: "Fix grammar",
    pendingLabel: "Fixing grammar…",
    description: "Correct spelling, punctuation & syntax",
    icon: CheckCheck,
    errorType: "grammar",
    badgeVariant: "sky",
  },
  {
    action: "improve-style",
    label: "Improve style",
    pendingLabel: "Improving style…",
    description: "Enhance vocabulary, flow & tone",
    icon: Wand2,
    errorType: "style",
    badgeVariant: "violet",
  },
  {
    action: "make-natural",
    label: "Make natural",
    pendingLabel: "Making natural…",
    description: "Sound like a native speaker",
    icon: Languages,
    errorType: "vocabulary",
    badgeVariant: "emerald",
  },
];

const GENERIC_ERROR =
  "The Inline Suggestion could not be generated. Try again.";

export interface PendingSuggestion {
  action: InlineSuggestionAction;
  originalText: string;
  suggestedText: string;
  errorType: "grammar" | "style" | "vocabulary";
  contextBefore?: string;
  contextAfter?: string;
  from: number;
  to: number;
}

interface InlineSuggestionDiffCardProps {
  suggestion: PendingSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  onSaveVocabulary: () => void;
  isSavingVocabulary?: boolean;
  vocabularySaved?: boolean;
}

export function InlineSuggestionDiffCard({
  suggestion,
  onAccept,
  onDismiss,
  onSaveVocabulary,
  isSavingVocabulary = false,
  vocabularySaved = false,
}: InlineSuggestionDiffCardProps) {
  const actionMeta = INLINE_SUGGESTION_ACTIONS.find(
    (a) => a.action === suggestion.action
  );
  const ActionIcon = actionMeta?.icon ?? Sparkles;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onAccept();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    },
    [onAccept, onDismiss]
  );

  // Listen on window for global shortcuts while diff preview is displayed
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      role="dialog"
      aria-label="AI Suggestion Diff Preview"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="flex w-[340px] max-w-[90vw] flex-col gap-2.5 rounded-lg border bg-popover/98 p-3 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header with Title, Category Badge, and Close Button */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ActionIcon className="size-4 text-primary shrink-0" />
          <span className="text-xs font-semibold truncate">
            {actionMeta?.label ?? "AI Rewrite"}
          </span>
          <Badge
            variant="secondary"
            className={`text-[10px] font-medium h-4 px-1.5 rounded-full shrink-0 ${
              suggestion.errorType === "grammar"
                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                : suggestion.errorType === "style"
                  ? "bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {suggestion.errorType.toUpperCase()}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="size-6 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onDismiss}
          aria-label="Close diff preview"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Diff comparison preview */}
      <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-2.5 text-xs border border-border/50">
        {/* Original Text (Strikethrough / Red) */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
            Original
          </span>
          <div className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1 font-mono text-xs text-red-700 dark:text-red-300 line-through decoration-red-500/70 break-words leading-relaxed">
            {suggestion.originalText}
          </div>
        </div>

        {/* Arrow Divider */}
        <div className="flex items-center justify-center py-0.5 text-muted-foreground/60">
          <ArrowRight className="size-3.5" />
        </div>

        {/* Suggested Text (Green / Highlight) */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
            Suggested
          </span>
          <div className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 font-mono text-xs font-medium text-emerald-800 dark:text-emerald-200 break-words leading-relaxed">
            {suggestion.suggestedText}
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          disabled={isSavingVocabulary || vocabularySaved}
          onClick={onSaveVocabulary}
          aria-label={
            vocabularySaved
              ? "Saved to Vocabulary"
              : isSavingVocabulary
                ? "Saving…"
                : "Save to Vocabulary"
          }
        >
          {isSavingVocabulary ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <BookMarked
              className={`size-3.5 ${vocabularySaved ? "text-primary" : ""}`}
            />
          )}
          <span>{vocabularySaved ? "Saved" : "Save vocab"}</span>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
            aria-label="Dismiss suggestion"
          >
            Dismiss
            <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">
              Esc
            </kbd>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-7 gap-1 px-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
            onClick={onAccept}
            aria-label="Accept suggestion"
          >
            <Check className="size-3.5" />
            <span>Accept</span>
            <kbd className="ml-0.5 rounded bg-emerald-700/60 dark:bg-emerald-800/60 px-1 text-[10px] text-white">
              ↵
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface InlineSuggestionActionsProps {
  editor?: Editor;
  activeAction?: InlineSuggestionAction | null;
  pendingSuggestion?: PendingSuggestion | null;
  error?: string | null;
  onAction: (action: InlineSuggestionAction) => void;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
  onSaveVocabulary: () => void;
  isSavingVocabulary?: boolean;
  vocabularySaved?: boolean;
  onAskAi?: () => void;
}

export function InlineSuggestionActions({
  editor,
  activeAction = null,
  pendingSuggestion = null,
  error = null,
  onAction,
  onAcceptSuggestion,
  onDismissSuggestion,
  onSaveVocabulary,
  isSavingVocabulary = false,
  vocabularySaved = false,
  onAskAi,
}: InlineSuggestionActionsProps) {
  const toggleHighlight = (color: string) => {
    if (!editor) return;
    if (editor.isActive("highlight", { color })) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
  };

  const removeHighlight = () => {
    if (!editor) return;
    editor.chain().focus().unsetHighlight().run();
  };

  const hasHighlight = editor ? editor.isActive("highlight") : false;

  const currentActiveAction = INLINE_SUGGESTION_ACTIONS.find(
    (a) => a.action === activeAction
  );

  // If there's an active diff suggestion, render the Diff Card
  if (pendingSuggestion && onAcceptSuggestion && onDismissSuggestion) {
    return (
      <InlineSuggestionDiffCard
        suggestion={pendingSuggestion}
        onAccept={onAcceptSuggestion}
        onDismiss={onDismissSuggestion}
        onSaveVocabulary={onSaveVocabulary}
        isSavingVocabulary={isSavingVocabulary}
        vocabularySaved={vocabularySaved}
      />
    );
  }

  return (
    <div className="relative z-50 flex max-w-fit flex-col gap-1.5 rounded-lg border bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-sm">
      <div
        className="flex flex-wrap items-center gap-0.5"
        role="toolbar"
        aria-label="Inline Suggestion actions"
        aria-busy={activeAction !== null}
      >
        {/* ── Rich text formatting (when editor is attached) ──────── */}
        {editor && (
          <>
            <Button
              type="button"
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              size="icon-xs"
              className="size-7"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Bold"
              aria-pressed={editor.isActive("bold")}
            >
              <Bold className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              size="icon-xs"
              className="size-7"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic"
              aria-pressed={editor.isActive("italic")}
            >
              <Italic className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant={editor.isActive("code") ? "secondary" : "ghost"}
              size="icon-xs"
              className="size-7"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleCode().run()}
              aria-label="Inline code"
              aria-pressed={editor.isActive("code")}
            >
              <Code className="size-3.5" />
            </Button>

            {/* Separator */}
            <div
              className="mx-1 h-4 w-px bg-border shrink-0"
              aria-hidden="true"
            />

            {/* Highlight color dots */}
            <div
              className="flex items-center gap-1 px-0.5"
              title="Highlight text"
            >
              <Highlighter
                className="size-3 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              {HIGHLIGHT_COLORS.map(({ label, color, className }) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleHighlight(color)}
                  aria-label={label}
                  aria-pressed={editor.isActive("highlight", { color })}
                  className={`size-3.5 rounded-full border border-black/10 transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className} ${
                    editor.isActive("highlight", { color })
                      ? "ring-2 ring-ring ring-offset-1 scale-110"
                      : ""
                  }`}
                />
              ))}
              {hasHighlight && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={removeHighlight}
                  aria-label="Remove highlight"
                  title="Remove highlight"
                  className="flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </div>

            {/* Separator */}
            <div
              className="mx-1 h-4 w-px bg-border shrink-0"
              aria-hidden="true"
            />
          </>
        )}

        {/* ── AI Suggestions Dropdown ─────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={activeAction !== null ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              disabled={activeAction !== null || isSavingVocabulary}
              onMouseDown={(event) => event.preventDefault()}
              aria-label={
                currentActiveAction
                  ? currentActiveAction.pendingLabel
                  : "AI Rewrite"
              }
            >
              {activeAction !== null ? (
                <>
                  <Spinner data-icon="inline-start" />
                  <span>
                    {currentActiveAction?.pendingLabel ?? "Processing…"}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 text-primary" />
                  <span>AI Rewrite</span>
                  <ChevronDown className="size-3 text-muted-foreground opacity-60" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={6}
            className="w-56 p-1 z-50"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuGroup>
              {INLINE_SUGGESTION_ACTIONS.map(
                ({ action, label, description, icon: ActionIcon }) => (
                  <DropdownMenuItem
                    key={action}
                    onSelect={() => onAction(action)}
                    className="flex flex-col items-start gap-0.5 py-1.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-medium text-xs">
                      <ActionIcon className="size-3.5 text-primary" />
                      <span>{label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground pl-5.5">
                      {description}
                    </span>
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator */}
        <div className="mx-1 h-4 w-px bg-border shrink-0" aria-hidden="true" />

        {/* ── Save to Vocabulary ─────────────────────────────────── */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={
            activeAction !== null || isSavingVocabulary || vocabularySaved
          }
          onMouseDown={(event) => event.preventDefault()}
          onClick={onSaveVocabulary}
          aria-label={
            vocabularySaved
              ? "Saved to Vocabulary"
              : isSavingVocabulary
                ? "Saving…"
                : "Save to Vocabulary"
          }
        >
          {isSavingVocabulary && <Spinner data-icon="inline-start" />}
          <BookMarked
            className={`size-3.5 ${vocabularySaved ? "text-primary" : ""}`}
          />
          <span>{vocabularySaved ? "Saved" : "Save vocab"}</span>
        </Button>

        {/* ── Ask AI ─────────────────────────────────────────────── */}
        {onAskAi && (
          <>
            <div
              className="mx-1 h-4 w-px bg-border shrink-0"
              aria-hidden="true"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={activeAction !== null || isSavingVocabulary}
              onMouseDown={(event) => event.preventDefault()}
              onClick={onAskAi}
              aria-label="Ask AI about selected text"
            >
              <Bot className="size-3.5" />
              Ask AI
            </Button>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="py-1.5 px-2.5">
          <CircleAlert className="size-3.5" />
          <AlertTitle className="text-xs font-semibold">
            Inline Suggestion failed
          </AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

class InlineSuggestionRequestError extends Error {}

/** Fire-and-forget: save a correction + create a review item. Errors are swallowed silently. */
async function saveCorrection(payload: {
  documentId: string;
  originalText: string;
  correctedText: string;
  errorType: "grammar" | "vocabulary" | "style";
  context: string;
}) {
  try {
    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
  } catch {
    // Silently ignore — correction saving must not interrupt the editor flow
  }
}

/** Fire-and-forget: save a vocabulary item. */
async function saveVocabularyItem(payload: {
  phrase: string;
  documentId: string;
}) {
  const res = await fetch("/api/vocabulary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Could not save Vocabulary Item.");
  }
}

export function InlineSuggestionMenu({
  editor,
  documentId,
  onAskAi,
}: {
  editor: Editor;
  documentId: string;
  onAskAi?: (selectedText: string) => void;
}) {
  const [activeAction, setActiveAction] =
    useState<InlineSuggestionAction | null>(null);
  const [pendingSuggestion, setPendingSuggestion] =
    useState<PendingSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSavingVocabulary, setIsSavingVocabulary] = useState(false);
  const [vocabularySaved, setVocabularySaved] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset states when selection changes
  useEffect(() => {
    const handler = () => {
      setVocabularySaved(false);
      // Only clear pending suggestion if selection collapsed
      const { from, to } = editor.state.selection;
      if (from === to) {
        setPendingSuggestion(null);
      }
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  const fetchSuggestion = useCallback(
    async (action: InlineSuggestionAction) => {
      const { from, to } = editor.state.selection;
      if (from === to) return;

      const selectedText = editor.state.doc.textBetween(from, to, "\n");
      if (selectedText.trim().length === 0) return;

      const contextBefore = editor.state.doc.textBetween(0, from, "\n");
      const contextAfter = editor.state.doc.textBetween(
        to,
        editor.state.doc.content.size,
        "\n"
      );

      const controller = new AbortController();
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;
      setActiveAction(action);
      setPendingSuggestion(null);
      setError(null);

      try {
        const response = await fetch("/api/inline-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            selectedText,
            contextBefore,
            contextAfter,
          } satisfies InlineSuggestionRequest),
          signal: controller.signal,
        });
        const result = (await response.json().catch(() => null)) as {
          suggestion?: string;
          error?: string;
        } | null;

        if (!response.ok || typeof result?.suggestion !== "string") {
          throw new InlineSuggestionRequestError(
            result?.error ?? GENERIC_ERROR
          );
        }

        const currentSelectedText = editor.state.doc.textBetween(
          from,
          to,
          "\n"
        );
        if (currentSelectedText !== selectedText) {
          throw new InlineSuggestionRequestError(
            "The selected text changed before the Inline Suggestion was ready. Select it and try again."
          );
        }

        const errorType = INLINE_SUGGESTION_ACTIONS.find(
          (a) => a.action === action
        )!.errorType;

        // Stage the suggestion for user review in the Diff Card
        setPendingSuggestion({
          action,
          originalText: selectedText,
          suggestedText: result.suggestion,
          errorType,
          contextBefore,
          contextAfter,
          from,
          to,
        });
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof InlineSuggestionRequestError
            ? requestError.message
            : GENERIC_ERROR
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setActiveAction(null);
        }
      }
    },
    [editor]
  );

  const handleAcceptSuggestion = useCallback(() => {
    if (!pendingSuggestion) return;
    const {
      from,
      to,
      originalText,
      suggestedText,
      errorType,
      contextBefore,
      contextAfter,
    } = pendingSuggestion;

    // Apply correction into the editor
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, { type: "text", text: suggestedText })
      .run();

    // Auto-save Correction to Correction Bank (fire-and-forget)
    void saveCorrection({
      documentId,
      originalText,
      correctedText: suggestedText,
      errorType,
      context: `${(contextBefore ?? "").slice(-200)}[SELECTED]${(contextAfter ?? "").slice(0, 200)}`,
    });

    setPendingSuggestion(null);
  }, [editor, pendingSuggestion, documentId]);

  const handleDismissSuggestion = useCallback(() => {
    setPendingSuggestion(null);
  }, []);

  const handleSaveVocabulary = useCallback(async () => {
    const targetPhrase =
      pendingSuggestion?.suggestedText ||
      (() => {
        const { from, to } = editor.state.selection;
        if (from === to) return "";
        return editor.state.doc.textBetween(from, to, " ").trim();
      })();

    if (!targetPhrase) return;

    setIsSavingVocabulary(true);
    setError(null);

    try {
      await saveVocabularyItem({ phrase: targetPhrase, documentId });
      setVocabularySaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save Vocabulary Item."
      );
    } finally {
      setIsSavingVocabulary(false);
    }
  }, [editor, pendingSuggestion, documentId]);

  const handleAskAi = useCallback(() => {
    if (!onAskAi) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (text.length === 0) return;
    onAskAi(text);
  }, [editor, onAskAi]);

  return (
    <BubbleMenu
      editor={editor}
      className="z-50"
      pluginKey="inlineSuggestionMenu"
      updateDelay={0}
      options={{ placement: "top-start", offset: 8 }}
      shouldShow={({ editor: currentEditor, from, to }) =>
        Boolean(pendingSuggestion || (currentEditor.isEditable && from !== to))
      }
    >
      <InlineSuggestionActions
        editor={editor}
        activeAction={activeAction}
        pendingSuggestion={pendingSuggestion}
        error={error}
        onAction={(action) => void fetchSuggestion(action)}
        onAcceptSuggestion={handleAcceptSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
        onSaveVocabulary={() => void handleSaveVocabulary()}
        isSavingVocabulary={isSavingVocabulary}
        vocabularySaved={vocabularySaved}
        onAskAi={onAskAi ? () => handleAskAi() : undefined}
      />
    </BubbleMenu>
  );
}
