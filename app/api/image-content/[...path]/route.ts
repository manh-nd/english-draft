import { createImageContentUpstreamUrl } from "@/lib/storage/images";

interface ImageContentRouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: ImageContentRouteContext) {
  const { path } = await context.params;
  const minioUrl = createImageContentUpstreamUrl(
    path,
    new URL(request.url).search
  );

  const upstreamResponse = await fetch(minioUrl, { redirect: "manual" });
  const headers = new Headers();
  for (const name of [
    "Cache-Control",
    "Content-Length",
    "Content-Type",
    "ETag",
    "Last-Modified",
  ]) {
    const value = upstreamResponse.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}
