"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  BookMarked,
  Bot,
  CircleAlert,
  Code,
  Highlighter,
  Italic,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

const INLINE_SUGGESTION_ACTIONS: Array<{
  action: InlineSuggestionAction;
  label: string;
  pendingLabel: string;
  errorType: "grammar" | "style" | "vocabulary";
}> = [
  {
    action: "fix-grammar",
    label: "Fix grammar",
    pendingLabel: "Fixing grammar…",
    errorType: "grammar",
  },
  {
    action: "improve-style",
    label: "Improve style",
    pendingLabel: "Improving style…",
    errorType: "style",
  },
  {
    action: "make-natural",
    label: "Make natural",
    pendingLabel: "Making natural…",
    errorType: "vocabulary",
  },
];

const GENERIC_ERROR =
  "The Inline Suggestion could not be generated. Try again.";

interface InlineSuggestionActionsProps {
  editor?: Editor;
  activeAction?: InlineSuggestionAction | null;
  error?: string | null;
  onAction: (action: InlineSuggestionAction) => void;
  onSaveVocabulary: () => void;
  isSavingVocabulary?: boolean;
  vocabularySaved?: boolean;
  onAskAi?: () => void;
}

export function InlineSuggestionActions({
  editor,
  activeAction = null,
  error = null,
  onAction,
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

  return (
    <div className="flex max-w-fit flex-col gap-1.5 rounded-lg border bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-sm">
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

        {/* ── AI Suggestion Actions ───────────────────────────────── */}
        {INLINE_SUGGESTION_ACTIONS.map(({ action, label, pendingLabel }) => {
          const isActive = activeAction === action;

          return (
            <Button
              key={action}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={activeAction !== null || isSavingVocabulary}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAction(action)}
              aria-label={isActive ? pendingLabel : label}
            >
              {isActive && <Spinner data-icon="inline-start" />}
              {isActive ? pendingLabel : label}
            </Button>
          );
        })}

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
          {vocabularySaved ? "Saved" : "Save vocab"}
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
  const [error, setError] = useState<string | null>(null);
  const [isSavingVocabulary, setIsSavingVocabulary] = useState(false);
  const [vocabularySaved, setVocabularySaved] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset vocabulary saved state when selection changes
  useEffect(() => {
    const handler = () => setVocabularySaved(false);
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

  const applySuggestion = useCallback(
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

        // Apply correction to editor
        editor
          .chain()
          .focus()
          .insertContentAt(
            { from, to },
            { type: "text", text: result.suggestion }
          )
          .run();

        // Auto-save Correction (fire-and-forget)
        const errorType = INLINE_SUGGESTION_ACTIONS.find(
          (a) => a.action === action
        )!.errorType;
        void saveCorrection({
          documentId,
          originalText: selectedText,
          correctedText: result.suggestion,
          errorType,
          context: `${contextBefore.slice(-200)}[SELECTED]${contextAfter.slice(0, 200)}`,
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
    [editor, documentId]
  );

  const handleSaveVocabulary = useCallback(async () => {
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
    if (selectedText.length === 0) return;

    setIsSavingVocabulary(true);
    setError(null);

    try {
      await saveVocabularyItem({ phrase: selectedText, documentId });
      setVocabularySaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save Vocabulary Item."
      );
    } finally {
      setIsSavingVocabulary(false);
    }
  }, [editor, documentId]);

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
      pluginKey="inlineSuggestionMenu"
      updateDelay={0}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: currentEditor, from, to }) =>
        currentEditor.isEditable && from !== to
      }
    >
      <InlineSuggestionActions
        editor={editor}
        activeAction={activeAction}
        error={error}
        onAction={(action) => void applySuggestion(action)}
        onSaveVocabulary={() => void handleSaveVocabulary()}
        isSavingVocabulary={isSavingVocabulary}
        vocabularySaved={vocabularySaved}
        onAskAi={onAskAi ? () => handleAskAi() : undefined}
      />
    </BubbleMenu>
  );
}
