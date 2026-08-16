import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODELS = {
  FLASH: "gemini-3.6-flash",
  FLASH_LITE: "gemini-3.5-flash-lite",
} as const;

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

export interface GenerateOptions {
  model?: GeminiModel;
}

export class GeminiQuotaExhaustedError extends Error {
  constructor(cause?: unknown) {
    super(
      "AI is temporarily unavailable because all Gemini API keys have reached their rate limits. Please try again later.",
      { cause }
    );
    this.name = "GeminiQuotaExhaustedError";
  }
}

function readApiKeys() {
  const keys = (process.env.GEMINI_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error("GEMINI_API_KEYS must contain at least one API key");
  }

  return keys;
}

function isRateLimitError(error: unknown): error is { status: 429 } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 429
  );
}

export function createGeminiService() {
  const clients = readApiKeys().map((apiKey) => new GoogleGenAI({ apiKey }));
  const nextClientByModel = new Map<GeminiModel, number>();

  return {
    async generate(
      prompt: string,
      { model = GEMINI_MODELS.FLASH_LITE }: GenerateOptions = {}
    ) {
      let lastRateLimitError: unknown;
      const modelFallbackChain: GeminiModel[] =
        model === GEMINI_MODELS.FLASH
          ? [GEMINI_MODELS.FLASH, GEMINI_MODELS.FLASH_LITE]
          : [GEMINI_MODELS.FLASH_LITE];

      for (const attemptedModel of modelFallbackChain) {
        const startingClientIndex = nextClientByModel.get(attemptedModel) ?? 0;
        nextClientByModel.set(
          attemptedModel,
          (startingClientIndex + 1) % clients.length
        );

        for (let attempt = 0; attempt < clients.length; attempt += 1) {
          const clientIndex = (startingClientIndex + attempt) % clients.length;

          try {
            const response = await clients[clientIndex].models.generateContent({
              model: attemptedModel,
              contents: prompt,
            });

            return response.text ?? "";
          } catch (error) {
            if (!isRateLimitError(error)) throw error;
            lastRateLimitError = error;
          }
        }
      }

      throw new GeminiQuotaExhaustedError(lastRateLimitError);
    },

    async generateStream(
      prompt: string,
      { model = GEMINI_MODELS.FLASH_LITE }: GenerateOptions = {}
    ): Promise<AsyncIterable<{ text?: string | null }>> {
      let lastRateLimitError: unknown;
      const modelFallbackChain: GeminiModel[] =
        model === GEMINI_MODELS.FLASH
          ? [GEMINI_MODELS.FLASH, GEMINI_MODELS.FLASH_LITE]
          : [GEMINI_MODELS.FLASH_LITE];

      for (const attemptedModel of modelFallbackChain) {
        const startingClientIndex = nextClientByModel.get(attemptedModel) ?? 0;
        nextClientByModel.set(
          attemptedModel,
          (startingClientIndex + 1) % clients.length
        );

        for (let attempt = 0; attempt < clients.length; attempt += 1) {
          const clientIndex = (startingClientIndex + attempt) % clients.length;

          try {
            const responseStream = await clients[
              clientIndex
            ].models.generateContentStream({
              model: attemptedModel,
              contents: prompt,
            });

            return responseStream;
          } catch (error) {
            if (!isRateLimitError(error)) throw error;
            lastRateLimitError = error;
          }
        }
      }

      throw new GeminiQuotaExhaustedError(lastRateLimitError);
    },
  };
}
