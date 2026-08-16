import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import {
  createGeminiService,
  GeminiQuotaExhaustedError,
} from "@/lib/ai/gemini";
import { buildChatPrompt, type ChatMessage } from "@/lib/ai/chat";
import { getDocument } from "@/lib/db/documents";

let geminiService: ReturnType<typeof createGeminiService> | undefined;
function getGeminiService() {
  geminiService ??= createGeminiService();
  return geminiService;
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const body = await req.json().catch(() => null);
  const messages = body?.messages as ChatMessage[] | undefined;
  const includeDocument = Boolean(body?.includeDocument);
  const documentId = body?.documentId as string | undefined;

  // Validate messages
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some(
      (m) =>
        !m ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "messages must be a non-empty array of { role, content } objects",
      },
      { status: 400 }
    );
  }

  // Optionally fetch document text for context
  let documentText: string | null = null;
  if (includeDocument && documentId) {
    const doc = await getDocument(result.userId, documentId);
    documentText = doc?.textContent ?? null;
  }

  const prompt = buildChatPrompt({ messages, documentText });

  try {
    const reply = await getGeminiService().generate(prompt);
    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    if (error instanceof GeminiQuotaExhaustedError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Side Panel Chat failed", error);
    return NextResponse.json(
      { error: "The AI could not generate a response. Try again." },
      { status: 503 }
    );
  }
}
