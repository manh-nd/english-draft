import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import {
  createPresignedImageUrl,
  parseOwnedImageKey,
} from "@/lib/storage/images";

interface ImageRouteContext {
  params: Promise<{ key: string[] }>;
}

export async function GET(request: Request, context: ImageRouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { key: segments } = await context.params;
  const key = parseOwnedImageKey(segments.join("/"), session.userId);
  if (!key) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const presignedUrl = new URL(await createPresignedImageUrl(key));
  const proxyUrl = new URL(
    `/api/image-content${presignedUrl.pathname}`,
    request.url
  );
  proxyUrl.search = presignedUrl.search;

  const response = NextResponse.redirect(proxyUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
