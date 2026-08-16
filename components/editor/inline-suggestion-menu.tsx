"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { BookMarked, Bot, CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  type InlineSuggestionAction,
  type InlineSuggestionRequest,
} from "@/lib/ai/inline-suggestions";

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
  activeAction?: InlineSuggestionAction | null;
  error?: string | null;
  onAction: (action: InlineSuggestionAction) => void;
  onSaveVocabulary: () => void;
  isSavingVocabulary?: boolean;
  vocabularySaved?: boolean;
  onAskAi?: () => void;
}

export function InlineSuggestionActions({
  activeAction = null,
  error = null,
  onAction,
  onSaveVocabulary,
  isSavingVocabulary = false,
  vocabularySaved = false,
  onAskAi,
}: InlineSuggestionActionsProps) {
  return (
    <div className="flex max-w-md flex-col gap-1 border bg-popover p-1 text-popover-foreground shadow-md">
      <div
        className="flex items-center gap-1"
        role="toolbar"
        aria-label="Inline Suggestion actions"
        aria-busy={activeAction !== null}
      >
        {INLINE_SUGGESTION_ACTIONS.map(({ action, label, pendingLabel }) => {
          const isActive = activeAction === action;

          return (
            <Button
              key={action}
              type="button"
              variant="ghost"
              size="sm"
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
        <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        {/* Save to Vocabulary */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
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

        {/* Separator */}
        {onAskAi && (
          <>
            <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            {/* Ask AI — opens side panel with selected text as context */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Inline Suggestion failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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
