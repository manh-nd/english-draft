import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { requireSession } from "@/lib/api/require-session";
import { NextResponse } from "next/server";

interface GenerateRequest {
  model: string;
  contents: string;
}

const sdkCalls: GenerateRequest[] = [];
let generateContent: (
  request: GenerateRequest
) => Promise<{ text: string }> = async () => ({
  text: "Improved text",
});

mock.module("@google/genai", () => ({
  GoogleGenAI: class {
    readonly models = {
      generateContent: async (request: GenerateRequest) => {
        sdkCalls.push(request);
        return generateContent(request);
      },
    };
  },
}));

const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: "user-1",
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

process.env.GEMINI_API_KEYS = "test-key";

const { POST } = await import("./route");

function suggestionRequest(body: unknown) {
  return new Request("http://localhost/api/inline-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  sdkCalls.length = 0;
  generateContent = async () => ({ text: "Improved text" });
  mockRequireSession.mockReset();
  mockRequireSession.mockResolvedValue({ userId: "user-1" });
});

describe("POST /api/inline-suggestions", () => {
  test.each([
    [
      "fix-grammar",
      "Correct the grammar in the selected text while preserving its meaning, tone, and formatting.",
    ],
    [
      "improve-style",
      "Rewrite the selected text to be clearer and more polished while preserving its meaning and formatting.",
    ],
    [
      "make-natural",
      "Rewrite the selected text so it sounds natural to a fluent English speaker while preserving its meaning and formatting.",
    ],
  ])(
    "generates a %s Inline Suggestion with surrounding context",
    async (action, instruction) => {
      const response = await POST(
        suggestionRequest({
          action,
          selectedText: "She go to work.",
          contextBefore: "Hi team,",
          contextAfter: "Kind regards,",
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ suggestion: "Improved text" });
      expect(sdkCalls).toHaveLength(1);
      expect(sdkCalls[0]?.model).toBe("gemini-3.5-flash-lite");
      expect(sdkCalls[0]?.contents).toBe(`${instruction}
Return only the revised selected text with no explanation or quotation marks.

Use the surrounding Document context to improve only the selected text.

<document_context_before>
Hi team,
</document_context_before>

<selected_text>
She go to work.
</selected_text>

<document_context_after>
Kind regards,
</document_context_after>`);
    }
  );

  test.each(["translate", "toString"])(
    "rejects the invalid %s action before calling Gemini",
    async (action) => {
      const response = await POST(
        suggestionRequest({
          action,
          selectedText: "Selected text",
        })
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Choose an Inline Suggestion action and select some text.",
      });
      expect(sdkCalls).toHaveLength(0);
    }
  );

  test("requires authentication", async () => {
    mockRequireSession.mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(
      suggestionRequest({
        action: "fix-grammar",
        selectedText: "She go.",
      })
    );

    expect(response.status).toBe(401);
    expect(sdkCalls).toHaveLength(0);
  });

  test("returns a user-friendly error when Gemini quota is exhausted", async () => {
    generateContent = async () => {
      throw { status: 429 };
    };

    const response = await POST(
      suggestionRequest({
        action: "fix-grammar",
        selectedText: "She go.",
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "AI is temporarily unavailable because all Gemini API keys have reached their rate limits. Please try again later.",
    });
  });
});
