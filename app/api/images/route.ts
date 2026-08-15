import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { imageExtensionForMimeType } from "@/lib/images";
import { createImageKey, storeImage } from "@/lib/storage/images";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose an image to upload." },
      { status: 400 }
    );
  }

  const extension = imageExtensionForMimeType(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Choose a PNG, JPEG, GIF, or WebP image." },
      { status: 415 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Choose an image smaller than 10 MB." },
      { status: 413 }
    );
  }

  const key = createImageKey(session.userId, extension);

  try {
    await storeImage(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (error) {
    console.error("Image upload failed", error);
    return NextResponse.json(
      { error: "The image could not be uploaded. Try again." },
      { status: 503 }
    );
  }

  return NextResponse.json({ url: `/api/images/${key}` }, { status: 201 });
}
