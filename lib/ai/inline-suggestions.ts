export const INLINE_SUGGESTION_ACTIONS = [
  "fix-grammar",
  "improve-style",
  "make-natural",
] as const;

export type InlineSuggestionAction = (typeof INLINE_SUGGESTION_ACTIONS)[number];

export interface InlineSuggestionRequest {
  action: InlineSuggestionAction;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
}

export function isInlineSuggestionAction(
  value: unknown
): value is InlineSuggestionAction {
  return (
    typeof value === "string" &&
    INLINE_SUGGESTION_ACTIONS.some((action) => action === value)
  );
}
