import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isImageExtension, type ImageExtension } from "@/lib/images";

const IMAGE_PREFIX = "images";
const IMAGE_FILE_NAME_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-z0-9]+)$/;

declare const imageKeyBrand: unique symbol;
export type ImageKey = string & { readonly [imageKeyBrand]: true };

interface ImageStorageConfig {
  bucket: string;
  uploadClient: S3Client;
}

let storageConfig: ImageStorageConfig | null = null;

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getStorageConfig(): ImageStorageConfig {
  if (storageConfig) return storageConfig;

  storageConfig = {
    bucket: requiredEnvironmentVariable("MINIO_BUCKET"),
    uploadClient: new S3Client({
      endpoint: requiredEnvironmentVariable("MINIO_ENDPOINT"),
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: requiredEnvironmentVariable("MINIO_ACCESS_KEY"),
        secretAccessKey: requiredEnvironmentVariable("MINIO_SECRET_KEY"),
      },
    }),
  };

  return storageConfig;
}

function ownerSegment(userId: string) {
  return Buffer.from(userId, "utf8").toString("base64url");
}

export function createImageKey(
  userId: string,
  extension: ImageExtension
): ImageKey {
  return `${IMAGE_PREFIX}/${ownerSegment(userId)}/${crypto.randomUUID()}.${extension}` as ImageKey;
}

export function parseOwnedImageKey(
  key: string,
  userId: string
): ImageKey | null {
  const [prefix, owner, fileName, ...extraSegments] = key.split("/");
  const fileNameMatch = fileName?.match(IMAGE_FILE_NAME_PATTERN);
  if (
    prefix !== IMAGE_PREFIX ||
    owner !== ownerSegment(userId) ||
    !fileName ||
    extraSegments.length > 0 ||
    !fileNameMatch ||
    !isImageExtension(fileNameMatch[2])
  ) {
    return null;
  }

  return key as ImageKey;
}

export async function storeImage(
  key: ImageKey,
  body: Uint8Array,
  contentType: string
) {
  const { bucket, uploadClient } = getStorageConfig();
  await uploadClient.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=31536000, immutable",
    })
  );
}

export async function createPresignedImageUrl(key: ImageKey) {
  const { bucket, uploadClient } = getStorageConfig();
  return getSignedUrl(
    uploadClient,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 5 * 60 }
  );
}

export function createImageContentUpstreamUrl(path: string[], search: string) {
  const minioUrl = new URL(requiredEnvironmentVariable("MINIO_ENDPOINT"));
  const basePath = minioUrl.pathname.replace(/\/$/, "");
  minioUrl.pathname = `${basePath}/${path.map(encodeURIComponent).join("/")}`;
  minioUrl.search = search;
  return minioUrl;
}
