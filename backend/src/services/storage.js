import crypto from 'node:crypto';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { badRequest, serviceUnavailable } from '../lib/errors.js';

/*
 * Images live in S3-compatible object storage, never in MongoDB. Binary blobs
 * in documents bloat the working set, break replication throughput and make
 * every query that touches the collection slower.
 *
 * The client is built lazily so the API boots fine with storage unconfigured:
 * uploads then fail with a clear 503 instead of the process refusing to start.
 */
const ALLOWED_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

let client = null;

function s3() {
  if (!env.s3Enabled) {
    throw serviceUnavailable('Image storage is not configured on this environment.', 'STORAGE_DISABLED');
  }
  if (!client) {
    client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/*
 * Keys are randomised rather than derived from the filename: user-supplied
 * names collide, leak information and can contain path traversal.
 */
export function buildKey(folder, originalName, contentType) {
  const extension = ALLOWED_TYPES.get(contentType) ?? path.extname(originalName || '').toLowerCase();
  const stamp = new Date().toISOString().slice(0, 7); // YYYY-MM
  return `${folder}/${stamp}/${crypto.randomUUID()}${extension}`;
}

export function assertUploadable({ contentType, size }) {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw badRequest('Only JPEG, PNG, WebP and AVIF images can be uploaded.', {
      received: contentType,
      allowed: [...ALLOWED_TYPES.keys()],
    });
  }
  if (size > env.UPLOAD_MAX_BYTES) {
    throw badRequest(`Images must be under ${Math.round(env.UPLOAD_MAX_BYTES / 1024 / 1024)} MB.`);
  }
}

export async function uploadBuffer({ buffer, key, contentType }) {
  await s3().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Long cache lifetime is safe because keys are immutable (random UUID).
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return { key, url: publicUrl(key) };
}

export function publicUrl(key) {
  if (!key) return null;
  const base = env.S3_PUBLIC_BASE_URL || `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;
  return `${base.replace(/\/$/, '')}/${key}`;
}

/* Used by the dashboard for direct browser-to-bucket uploads of large files,
 * which keeps big request bodies off the API instances entirely. */
export async function presignUpload({ folder, filename, contentType }) {
  assertUploadable({ contentType, size: 0 });
  const key = buildKey(folder, filename, contentType);
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  return { key, uploadUrl: url, publicUrl: publicUrl(key) };
}

export async function deleteObject(key) {
  if (!key) return;
  await s3().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export { ALLOWED_TYPES };
