"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { CircleAlert } from "lucide-react";
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
}> = [
  {
    action: "fix-grammar",
    label: "Fix grammar",
    pendingLabel: "Fixing grammar…",
  },
  {
    action: "improve-style",
    label: "Improve style",
    pendingLabel: "Improving style…",
  },
  {
    action: "make-natural",
    label: "Make natural",
    pendingLabel: "Making natural…",
  },
];

const GENERIC_ERROR =
  "The Inline Suggestion could not be generated. Try again.";

interface InlineSuggestionActionsProps {
  activeAction?: InlineSuggestionAction | null;
  error?: string | null;
  onAction: (action: InlineSuggestionAction) => void;
}

export function InlineSuggestionActions({
  activeAction = null,
  error = null,
  onAction,
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
              disabled={activeAction !== null}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAction(action)}
              aria-label={isActive ? pendingLabel : label}
            >
              {isActive && <Spinner data-icon="inline-start" />}
              {isActive ? pendingLabel : label}
            </Button>
          );
        })}
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

export function InlineSuggestionMenu({ editor }: { editor: Editor }) {
  const [activeAction, setActiveAction] =
    useState<InlineSuggestionAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
            contextBefore: editor.state.doc.textBetween(0, from, "\n"),
            contextAfter: editor.state.doc.textBetween(
              to,
              editor.state.doc.content.size,
              "\n"
            ),
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

        editor
          .chain()
          .focus()
          .insertContentAt(
            { from, to },
            { type: "text", text: result.suggestion }
          )
          .run();
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
      />
    </BubbleMenu>
  );
}
