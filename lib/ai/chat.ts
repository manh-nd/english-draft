import type { ExerciseType, ErrorType } from "@/lib/srs/sm2";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatPromptInput {
  messages: ChatMessage[];
  documentText?: string | null;
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTIONS = `You are an English learning assistant. The user is a Vietnamese professional learning English for work contexts.
 
Your role is to:
- Explain grammar patterns, vocabulary, idioms, and style
- Translate phrases or sentences between English and Vietnamese when asked
- Discuss and improve English text
- Answer questions about English usage in a professional context

Tone & Formatting Guidelines:
- Respond DIRECTLY with the substantive answer. Do NOT include conversational filler, pleasantries, or preambles (e.g. avoid "Sure!", "Certainly", "Here is the explanation:", "I would be happy to help").
- Use clean, structured Markdown:
  - Use **bold** for key terms, target vocabulary, and corrections
  - Use short bullet points for clear readability
  - Use code blocks or blockquotes for English examples, comparisons, and pattern templates
- Be concise, practical, and punchy. Provide natural workplace examples when helpful.`;

/**
 * Assemble a multi-turn chat prompt with optional document context.
 * Returns a single string prompt for the Gemini generateContent API.
 */
export function buildChatPrompt({
  messages,
  documentText,
}: ChatPromptInput): string {
  const parts: string[] = [SYSTEM_INSTRUCTIONS];

  if (documentText && documentText.trim().length > 0) {
    parts.push(
      `\nThe user is currently working on this document. Use it as context for your answers:\n\n<document>\n${documentText.trim()}\n</document>`
    );
  }

  parts.push("\n--- Conversation ---");

  for (const msg of messages) {
    const label = msg.role === "user" ? "User" : "Assistant";
    parts.push(`\n${label}: ${msg.content}`);
  }

  parts.push("\nAssistant:");

  return parts.join("");
}

// ─── Exercise prompt builders ─────────────────────────────────────────────────

export interface ExerciseSource {
  type: "correction" | "vocabulary";
  originalText?: string | null;
  correctedText?: string | null;
  errorType?: ErrorType | null;
  phrase?: string | null;
  definition?: string | null;
  exampleSentence?: string | null;
}

/**
 * Build a prompt asking Gemini to generate one exercise for a Review Item.
 */
export function buildExercisePrompt(
  source: ExerciseSource,
  exerciseType: ExerciseType
): string {
  const contextBlock =
    source.type === "correction"
      ? `Original text: "${source.originalText}"
Corrected text: "${source.correctedText}"
Error type: ${source.errorType}`
      : `Phrase: "${source.phrase}"
Definition: ${source.definition ?? "none provided"}
Example: ${source.exampleSentence ?? "none provided"}`;

  const exerciseInstructions: Record<ExerciseType, string> = {
    "fill-in-blank":
      "Create a fill-in-the-blank sentence where the key word or phrase is replaced with ___. Provide the sentence only.",
    rewrite:
      "Write one sentence containing the same error. Ask the user to rewrite it correctly. Format: 'Rewrite this sentence correctly:\\n[sentence with error]'",
    translation:
      "Write one short English sentence using this vocabulary/pattern. Ask the user to translate it to Vietnamese. Format: 'Translate this sentence to Vietnamese:\\n[sentence]'",
    "free-writing":
      "Give a short writing prompt that requires using this vocabulary or corrected grammar pattern in a professional work context. The prompt should be 1-2 sentences.",
  };

  return `Generate one ${exerciseType} exercise to help a Vietnamese English learner practice the following:

${contextBlock}

Exercise type instruction: ${exerciseInstructions[exerciseType]}

Return only the exercise text. No explanations, no answer key.`;
}

/**
 * Build a prompt asking Gemini to grade a user's exercise answer.
 */
export function buildGradingPrompt(
  exercisePrompt: string,
  userAnswer: string,
  source: ExerciseSource
): string {
  const sourceContext =
    source.type === "correction"
      ? `The correction being practiced: "${source.originalText}" → "${source.correctedText}"`
      : `The vocabulary being practiced: "${source.phrase}"`;

  return `You are grading an English learning exercise.

${sourceContext}

Exercise given to the user:
${exercisePrompt}

User's answer:
${userAnswer}

Grade the answer on a scale of 0 to 5:
5 = Perfect — correct and natural
4 = Good — correct with minor awkwardness  
3 = Acceptable — shows understanding but has errors
2 = Partial — partially correct but misses the key point
1 = Incorrect — attempted but wrong
0 = No attempt or completely off-topic

Respond in this exact JSON format:
{"rating": <number 0-5>, "feedback": "<1-2 sentence feedback in English>"}`;
}
