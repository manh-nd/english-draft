const SURROUNDING_CONTEXT_CHARACTER_LIMIT = 2_000;
const CONTEXT_CHARACTERS_PER_SIDE = SURROUNDING_CONTEXT_CHARACTER_LIMIT / 2;

export interface SelectionPromptInput {
  instruction: string;
  selectedText: string;
  contextBefore?: string;
  contextAfter?: string;
}

export interface DocumentPromptInput {
  instruction: string;
  documentText: string;
}

export function buildSelectionPrompt({
  instruction,
  selectedText,
  contextBefore = "",
  contextAfter = "",
}: SelectionPromptInput) {
  let contextBeforeLimit = Math.min(
    contextBefore.length,
    CONTEXT_CHARACTERS_PER_SIDE
  );
  let contextAfterLimit = Math.min(
    contextAfter.length,
    CONTEXT_CHARACTERS_PER_SIDE
  );
  let unallocatedCharacters =
    SURROUNDING_CONTEXT_CHARACTER_LIMIT -
    contextBeforeLimit -
    contextAfterLimit;

  const extraContextBefore = Math.min(
    unallocatedCharacters,
    contextBefore.length - contextBeforeLimit
  );
  contextBeforeLimit += extraContextBefore;
  unallocatedCharacters -= extraContextBefore;
  contextAfterLimit += Math.min(
    unallocatedCharacters,
    contextAfter.length - contextAfterLimit
  );

  const nearestContextBefore = contextBefore.slice(-contextBeforeLimit);
  const nearestContextAfter = contextAfter.slice(0, contextAfterLimit);

  return `${instruction}

Use the surrounding Document context to improve only the selected text.

<document_context_before>
${nearestContextBefore}
</document_context_before>

<selected_text>
${selectedText}
</selected_text>

<document_context_after>
${nearestContextAfter}
</document_context_after>`;
}

export function buildDocumentPrompt({
  instruction,
  documentText,
}: DocumentPromptInput) {
  return `${instruction}

Use the complete Document below as context.

<document>
${documentText}
</document>`;
}
