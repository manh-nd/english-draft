const IMAGE_FORMATS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

export type ImageMimeType = keyof typeof IMAGE_FORMATS;
export type ImageExtension = (typeof IMAGE_FORMATS)[ImageMimeType];

export const IMAGE_MIME_TYPES = Object.keys(IMAGE_FORMATS) as ImageMimeType[];
const IMAGE_EXTENSIONS = new Set<ImageExtension>(Object.values(IMAGE_FORMATS));

export function imageExtensionForMimeType(contentType: string) {
  return IMAGE_FORMATS[contentType as ImageMimeType] ?? null;
}

export function isImageExtension(value: string): value is ImageExtension {
  return IMAGE_EXTENSIONS.has(value as ImageExtension);
}
