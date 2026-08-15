import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

interface GenerateRequest {
  model: string;
  contents: string;
}

interface SdkCall extends GenerateRequest {
  apiKey: string;
}

const sdkCalls: SdkCall[] = [];
let generateContent = async (apiKey: string, request: GenerateRequest) => {
  void apiKey;
  void request;
  return { text: "generated text" };
};

mock.module("@google/genai", () => ({
  GoogleGenAI: class {
    readonly models;

    constructor({ apiKey }: { apiKey: string }) {
      this.models = {
        generateContent: async (request: GenerateRequest) => {
          sdkCalls.push({ apiKey, ...request });
          return generateContent(apiKey, request);
        },
      };
    }
  },
}));

const { createGeminiService, GEMINI_MODELS, GeminiQuotaExhaustedError } =
  await import("./gemini");

const originalGeminiApiKeys = process.env.GEMINI_API_KEYS;

beforeEach(() => {
  sdkCalls.length = 0;
  generateContent = async () => ({ text: "generated text" });
});

afterEach(() => {
  if (originalGeminiApiKeys === undefined) {
    delete process.env.GEMINI_API_KEYS;
  } else {
    process.env.GEMINI_API_KEYS = originalGeminiApiKeys;
  }
});

describe("Gemini service", () => {
  test("requires at least one API key during initialization", () => {
    delete process.env.GEMINI_API_KEYS;

    expect(() => createGeminiService()).toThrow(
      "GEMINI_API_KEYS must contain at least one API key"
    );
  });

  test("loads API keys from the environment and rotates requests round-robin", async () => {
    process.env.GEMINI_API_KEYS = " key-one, key-two ";
    const service = createGeminiService();

    await service.generate("First prompt");
    await service.generate("Second prompt");
    await service.generate("Third prompt");

    expect(sdkCalls).toEqual([
      {
        apiKey: "key-one",
        model: GEMINI_MODELS.FLASH_LITE,
        contents: "First prompt",
      },
      {
        apiKey: "key-two",
        model: GEMINI_MODELS.FLASH_LITE,
        contents: "Second prompt",
      },
      {
        apiKey: "key-one",
        model: GEMINI_MODELS.FLASH_LITE,
        contents: "Third prompt",
      },
    ]);
  });

  test("tracks round-robin position independently for each model", async () => {
    process.env.GEMINI_API_KEYS = "key-one,key-two";
    const service = createGeminiService();

    await service.generate("Lite one");
    await service.generate("Flash one", { model: GEMINI_MODELS.FLASH });
    await service.generate("Lite two");

    expect(sdkCalls.map(({ apiKey, model }) => ({ apiKey, model }))).toEqual([
      { apiKey: "key-one", model: GEMINI_MODELS.FLASH_LITE },
      { apiKey: "key-one", model: GEMINI_MODELS.FLASH },
      { apiKey: "key-two", model: GEMINI_MODELS.FLASH_LITE },
    ]);
  });

  test("retries a rate-limited request with the next key", async () => {
    process.env.GEMINI_API_KEYS = "limited-key,available-key";
    generateContent = async (apiKey) => {
      if (apiKey === "limited-key") throw { status: 429 };
      return { text: "corrected text" };
    };
    const service = createGeminiService();

    await expect(service.generate("Fix this")).resolves.toBe("corrected text");
    expect(sdkCalls.map(({ apiKey }) => apiKey)).toEqual([
      "limited-key",
      "available-key",
    ]);
  });

  test("concurrent requests keep an independent retry order", async () => {
    process.env.GEMINI_API_KEYS = "key-one,key-two";
    let releaseFirstAttempt = () => {};
    const firstAttemptCanFinish = new Promise<void>((resolve) => {
      releaseFirstAttempt = resolve;
    });
    generateContent = async (apiKey, request) => {
      if (apiKey === "key-one" && request.contents === "First prompt") {
        await firstAttemptCanFinish;
        throw { status: 429 };
      }
      return { text: `${request.contents} response` };
    };
    const service = createGeminiService();

    const firstRequest = service.generate("First prompt");
    const secondRequest = service.generate("Second prompt");
    await expect(secondRequest).resolves.toBe("Second prompt response");
    releaseFirstAttempt();
    await expect(firstRequest).resolves.toBe("First prompt response");

    expect(
      sdkCalls.map(({ apiKey, contents }) => ({ apiKey, contents }))
    ).toEqual([
      { apiKey: "key-one", contents: "First prompt" },
      { apiKey: "key-two", contents: "Second prompt" },
      { apiKey: "key-two", contents: "First prompt" },
    ]);
  });

  test("falls back from Flash to Flash Lite after every key is rate limited", async () => {
    process.env.GEMINI_API_KEYS = "key-one,key-two";
    generateContent = async (_apiKey, request) => {
      if (request.model === GEMINI_MODELS.FLASH) throw { status: 429 };
      return { text: "lite response" };
    };
    const service = createGeminiService();

    await expect(
      service.generate("Grade this", { model: GEMINI_MODELS.FLASH })
    ).resolves.toBe("lite response");
    expect(sdkCalls.map(({ apiKey, model }) => ({ apiKey, model }))).toEqual([
      { apiKey: "key-one", model: GEMINI_MODELS.FLASH },
      { apiKey: "key-two", model: GEMINI_MODELS.FLASH },
      { apiKey: "key-one", model: GEMINI_MODELS.FLASH_LITE },
    ]);
  });

  test("returns a clear error after all keys and model tiers are exhausted", async () => {
    process.env.GEMINI_API_KEYS = "key-one,key-two";
    generateContent = async () => {
      throw { status: 429 };
    };
    const service = createGeminiService();

    const request = service.generate("Grade this", {
      model: GEMINI_MODELS.FLASH,
    });

    await expect(request).rejects.toBeInstanceOf(GeminiQuotaExhaustedError);
    await expect(request).rejects.toHaveProperty(
      "message",
      "AI is temporarily unavailable because all Gemini API keys have reached their rate limits. Please try again later."
    );
    expect(sdkCalls).toHaveLength(4);
  });

  test("does not retry errors that are not rate limits", async () => {
    process.env.GEMINI_API_KEYS = "key-one,key-two";
    const upstreamError = { status: 500, message: "upstream failed" };
    generateContent = async () => {
      throw upstreamError;
    };
    const service = createGeminiService();

    await expect(service.generate("Try once")).rejects.toBe(upstreamError);
    expect(sdkCalls).toHaveLength(1);
  });
});
