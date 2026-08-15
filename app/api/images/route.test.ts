import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { requireSession } from "@/lib/api/require-session";

const USER_ID = "user-1";
let signedUrlCount = 0;
const storedObjects = new Map<
  string,
  { body: Uint8Array; contentType: string }
>();

class PutObjectCommand {
  constructor(
    public input: {
      Key: string;
      Body: Uint8Array;
      ContentType: string;
    }
  ) {}
}

class GetObjectCommand {
  constructor(public input: { Key: string }) {}
}

class S3Client {
  async send(command: PutObjectCommand | GetObjectCommand) {
    if (command instanceof PutObjectCommand) {
      storedObjects.set(command.input.Key, {
        body: command.input.Body,
        contentType: command.input.ContentType,
      });
      return {};
    }

    const object = storedObjects.get(command.input.Key);
    if (!object) {
      const error = new Error("Not found");
      error.name = "NoSuchKey";
      throw error;
    }

    return {
      Body: {
        transformToByteArray: async () => object.body,
      },
      ContentType: object.contentType,
    };
  }
}

mock.module("@aws-sdk/client-s3", () => ({
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
}));

mock.module("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async (_client: S3Client, command: GetObjectCommand) => {
    signedUrlCount += 1;
    return `http://localhost:9000/english-draft/${command.input.Key}?signature=${signedUrlCount}`;
  },
}));

const originalFetch = globalThis.fetch;
const mockMinioFetch = mock(async (input: string | URL | Request) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const [, bucket, ...keySegments] = url.pathname.split("/");
  const object = storedObjects.get(keySegments.join("/"));
  if (bucket !== "english-draft" || !object) {
    return new Response(null, { status: 404 });
  }

  const body = object.body.buffer.slice(
    object.body.byteOffset,
    object.body.byteOffset + object.body.byteLength
  ) as ArrayBuffer;
  return new Response(body, {
    headers: { "Content-Type": object.contentType },
  });
});

const mockRequireSession = mock<typeof requireSession>(async () => ({
  userId: USER_ID,
}));
mock.module("@/lib/api/require-session", () => ({
  requireSession: mockRequireSession,
}));

mock.module("next/server", () => {
  class NextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new NextResponse(JSON.stringify(data), {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
      });
    }

    static redirect(url: string | URL, status = 307) {
      return new NextResponse(null, {
        status,
        headers: { Location: url.toString() },
      });
    }
  }

  return { NextResponse };
});

process.env.MINIO_ENDPOINT = "http://minio:9000";
process.env.MINIO_ACCESS_KEY = "minioadmin";
process.env.MINIO_SECRET_KEY = "minioadmin";
process.env.MINIO_BUCKET = "english-draft";

import { POST } from "./route";
import { GET } from "./[...key]/route";
import { GET as GET_IMAGE_CONTENT } from "../image-content/[...path]/route";
import { NextResponse } from "next/server";

beforeEach(() => {
  storedObjects.clear();
  signedUrlCount = 0;
  globalThis.fetch = mockMinioFetch as unknown as typeof fetch;
  mockRequireSession.mockReset();
  mockRequireSession.mockResolvedValue({ userId: USER_ID });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function uploadRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.set("file", file);
  return new Request("http://localhost/api/images", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/images", () => {
  test("stores an image and redirects its stable URL to a fresh presigned URL after reload", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const uploadResponse = await POST(
      uploadRequest(new File([bytes], "diagram.png", { type: "image/png" }))
    );

    expect(uploadResponse.status).toBe(201);
    const { url } = (await uploadResponse.json()) as { url: string };
    expect(url).toMatch(/^\/api\/images\/images\/dXNlci0x\/[0-9a-f-]+\.png$/);

    const key = url.slice("/api/images/".length).split("/");
    const firstImageResponse = await GET(
      new Request(`http://localhost${url}`),
      {
        params: Promise.resolve({ key }),
      }
    );
    const reloadedImageResponse = await GET(
      new Request(`http://localhost${url}`),
      { params: Promise.resolve({ key }) }
    );

    expect(firstImageResponse.status).toBe(307);
    expect(firstImageResponse.headers.get("Location")).toMatch(
      /^http:\/\/localhost\/api\/image-content\/english-draft\/images\/dXNlci0x\/[0-9a-f-]+\.png\?signature=1$/
    );
    expect(reloadedImageResponse.status).toBe(307);
    expect(reloadedImageResponse.headers.get("Location")).toMatch(
      /\?signature=2$/
    );

    const contentUrl = firstImageResponse.headers.get("Location")!;
    const path = new URL(contentUrl).pathname
      .slice("/api/image-content/".length)
      .split("/");
    const contentResponse = await GET_IMAGE_CONTENT(new Request(contentUrl), {
      params: Promise.resolve({ path }),
    });
    expect(contentResponse.status).toBe(200);
    expect(contentResponse.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await contentResponse.arrayBuffer())).toEqual(bytes);
  });

  test("rejects unauthenticated uploads", async () => {
    mockRequireSession.mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(
      uploadRequest(new File(["image"], "diagram.png", { type: "image/png" }))
    );

    expect(response.status).toBe(401);
  });

  test("rejects unsupported file types with a user-facing error", async () => {
    const response = await POST(
      uploadRequest(
        new File(["plain text"], "notes.txt", { type: "text/plain" })
      )
    );

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      error: "Choose a PNG, JPEG, GIF, or WebP image.",
    });
  });
});
