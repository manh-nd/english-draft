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
  const streamRequested = body?.stream !== false;

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

  // Non-streaming response for backwards compatibility or explicit non-streaming requests
  if (!streamRequested) {
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

  // Real-time SSE streaming response
  try {
    const responseStream = await getGeminiService().generateStream(prompt);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk.text })}\n\n`
                )
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          if (streamError instanceof GeminiQuotaExhaustedError) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: streamError.message })}\n\n`
              )
            );
          } else {
            console.error("Error during chat stream iteration", streamError);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  error: "The AI stream encountered an error. Try again.",
                })}\n\n`
              )
            );
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof GeminiQuotaExhaustedError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Side Panel Chat stream initiation failed", error);
    return NextResponse.json(
      { error: "The AI could not generate a response. Try again." },
      { status: 503 }
    );
  }
}
