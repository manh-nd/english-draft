import { describe, expect, test } from "bun:test";
import { buildDocumentPrompt, buildSelectionPrompt } from "./prompts";

describe("buildSelectionPrompt", () => {
  test("assembles selected text with the nearest surrounding Document context", () => {
    expect(
      buildSelectionPrompt({
        instruction: "Fix the grammar.",
        selectedText: "She go to work.",
        contextBefore: "Email introduction.",
        contextAfter: "Email sign-off.",
      })
    ).toBe(`Fix the grammar.

Use the surrounding Document context to improve only the selected text.

<document_context_before>
Email introduction.
</document_context_before>

<selected_text>
She go to work.
</selected_text>

<document_context_after>
Email sign-off.
</document_context_after>`);
  });

  test("limits surrounding context to approximately 500 tokens", () => {
    const contextBefore = `distant-${"a".repeat(1_200)}-nearest-before`;
    const contextAfter = `nearest-after-${"b".repeat(1_200)}-distant`;

    const prompt = buildSelectionPrompt({
      instruction: "Make this natural.",
      selectedText: "Selected",
      contextBefore,
      contextAfter,
    });

    expect(prompt).not.toContain("distant-");
    expect(prompt).toContain("nearest-before");
    expect(prompt).toContain("nearest-after");
    expect(prompt).not.toContain("-distant");
  });

  test("uses the full context budget when the selection is at a Document boundary", () => {
    const promptAtStart = buildSelectionPrompt({
      instruction: "Fix this.",
      selectedText: "Selected",
      contextAfter: `${"a".repeat(1_500)}within-after-budget${"b".repeat(600)}out-after-budget`,
    });
    const promptAtEnd = buildSelectionPrompt({
      instruction: "Fix this.",
      selectedText: "Selected",
      contextBefore: `out-before-budget${"a".repeat(600)}within-before-budget${"b".repeat(1_500)}`,
    });

    expect(promptAtStart).toContain("within-after-budget");
    expect(promptAtStart).not.toContain("out-after-budget");
    expect(promptAtEnd).toContain("within-before-budget");
    expect(promptAtEnd).not.toContain("out-before-budget");
  });
});

describe("buildDocumentPrompt", () => {
  test("assembles the complete Document as context", () => {
    expect(
      buildDocumentPrompt({
        instruction: "Explain the conclusion.",
        documentText: "Introduction\n\nConclusion",
      })
    ).toBe(`Explain the conclusion.

Use the complete Document below as context.

<document>
Introduction

Conclusion
</document>`);
  });
});
