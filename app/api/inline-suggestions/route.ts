import { NextResponse } from "next/server";
import {
  createGeminiService,
  GeminiQuotaExhaustedError,
} from "@/lib/ai/gemini";
import {
  isInlineSuggestionAction,
  type InlineSuggestionAction,
} from "@/lib/ai/inline-suggestions";
import { buildSelectionPrompt } from "@/lib/ai/prompts";
import { requireSession } from "@/lib/api/require-session";

const INLINE_SUGGESTION_INSTRUCTIONS: Record<InlineSuggestionAction, string> = {
  "fix-grammar":
    "Correct the grammar in the selected text while preserving its meaning, tone, and formatting.",
  "improve-style":
    "Rewrite the selected text to be clearer and more polished while preserving its meaning and formatting.",
  "make-natural":
    "Rewrite the selected text so it sounds natural to a fluent English speaker while preserving its meaning and formatting.",
};

let geminiService: ReturnType<typeof createGeminiService> | undefined;

function getGeminiService() {
  geminiService ??= createGeminiService();
  return geminiService;
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const action = body?.action;
  const selectedText = body?.selectedText;
  const contextBefore = body?.contextBefore;
  const contextAfter = body?.contextAfter;

  if (
    !isInlineSuggestionAction(action) ||
    typeof selectedText !== "string" ||
    selectedText.trim().length === 0 ||
    (contextBefore !== undefined && typeof contextBefore !== "string") ||
    (contextAfter !== undefined && typeof contextAfter !== "string")
  ) {
    return NextResponse.json(
      { error: "Choose an Inline Suggestion action and select some text." },
      { status: 400 }
    );
  }

  const prompt = buildSelectionPrompt({
    instruction: `${INLINE_SUGGESTION_INSTRUCTIONS[action]}
Return only the revised selected text with no explanation or quotation marks.`,
    selectedText,
    contextBefore: contextBefore ?? "",
    contextAfter: contextAfter ?? "",
  });

  try {
    const suggestion = await getGeminiService().generate(prompt);
    if (suggestion.trim().length === 0) {
      throw new Error("Gemini returned an empty Inline Suggestion");
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    if (error instanceof GeminiQuotaExhaustedError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("Inline Suggestion generation failed", error);
    return NextResponse.json(
      { error: "The Inline Suggestion could not be generated. Try again." },
      { status: 503 }
    );
  }
}
