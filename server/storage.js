import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import { isCloudinaryConfigured, cloudinaryImageUrl, uploadCloudinaryImage } from './cloudinary.js';
import { decryptBuffer, encryptBuffer } from './crypto.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 64_000_000;
const MAX_LISTING_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PROFILE_IMAGE_BYTES = 1024 * 1024;

const client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
    : undefined
});
const localMediaRoot = path.resolve(process.cwd(), 'storage', 'media');
const localPrivateRoot = path.resolve(process.cwd(), 'storage', 'private');
const canUseObjectStorage = Boolean(
  process.env.S3_ACCESS_KEY_ID
  && process.env.S3_SECRET_ACCESS_KEY
  && process.env.S3_BUCKET
);
const canPublishObjectStorage = canUseObjectStorage && Boolean(process.env.S3_PUBLIC_BASE_URL);

const signatures = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'image/avif': [[0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  'video/mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]]
};

export function hasFileSignature(file) {
  const options = signatures[file?.mimetype] || [];
  const buffer = file?.buffer;
  if (!buffer) return false;
  if (file.mimetype === 'image/avif' || file.mimetype === 'video/mp4') {
    return buffer.length >= 12 && buffer.subarray(4, 12).toString('ascii') === (file.mimetype === 'image/avif' ? 'ftypavif' : 'ftyp');
  }
  return options.some(signature => signature.every((byte, index) => buffer[index] === byte));
}

export async function validateUpload(file, allowedTypes) {
  if (file?.buffer) {
    const mimeType = String(file.mimetype || '');
    const limit = mimeType.startsWith('image/') ? MAX_IMAGE_UPLOAD_BYTES : MAX_VIDEO_UPLOAD_BYTES;
    if (file.buffer.length > limit) {
      const error = new Error(`File is too large. Maximum size is ${Math.round(limit / 1024 / 1024)} MB`);
      error.statusCode = 413;
      throw error;
    }
  }
  if (!file || !allowedTypes.includes(file.mimetype) || !hasFileSignature(file)) {
    const error = new Error('File content does not match its declared type');
    error.statusCode = 400;
    throw error;
  }
  if (file.mimetype.startsWith('image/')) {
    try {
      await sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    } catch (cause) {
      const exceedsPixelLimit = /pixel limit/i.test(cause.message);
      const error = new Error(exceedsPixelLimit
        ? 'The image exceeds the 64-megapixel processing limit'
        : 'The uploaded image is invalid or corrupted');
      error.statusCode = exceedsPixelLimit ? 413 : 400;
      throw error;
    }
  }
  return file;
}

export async function optimizeImageBuffer(buffer, { width, height, fit, maxOutputBytes }) {
  for (const { scale, quality } of [
    { scale: 1, quality: 80 },
    { scale: 0.8, quality: 72 },
    { scale: 0.65, quality: 64 }
  ]) {
    let optimized;
    try {
      optimized = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
        .rotate()
        .resize({
          width: Math.max(1, Math.round(width * scale)),
          height: height ? Math.max(1, Math.round(height * scale)) : undefined,
          fit,
          withoutEnlargement: true
        })
        .webp({ quality, effort: 3 })
        .toBuffer();
    } catch (cause) {
      const exceedsPixelLimit = /pixel limit/i.test(cause.message);
      const isMemoryError = /memory|allocation/i.test(cause.message);
      const error = new Error(exceedsPixelLimit
        ? 'The image exceeds the 64-megapixel processing limit'
        : isMemoryError
          ? 'Image processing capacity is temporarily unavailable; retry with a smaller photo'
          : 'The uploaded image could not be decoded. Try exporting it as JPG or PNG and upload again');
      error.statusCode = exceedsPixelLimit ? 413 : isMemoryError ? 503 : 400;
      throw error;
    }
    if (optimized.length <= maxOutputBytes) return optimized;
  }
  const error = new Error('Image is too detailed to optimize below the upload storage limit');
  error.statusCode = 413;
  throw error;
}

async function storePublicObject(key, body, contentType) {
  if (canPublishObjectStorage) {
    try {
      await client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public,max-age=31536000,immutable',
        ServerSideEncryption: 'AES256'
      }));
      return { key, url: `${process.env.S3_PUBLIC_BASE_URL}/${key}` };
    } catch (error) {
      console.warn('Object storage upload failed; using local media storage:', error.message);
    }
  }
  const filePath = path.join(localMediaRoot, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
  return { key, url: `/media/${key.split('/').map(encodeURIComponent).join('/')}` };
}

async function storePublicImage(key, body) {
  if (isCloudinaryConfigured) {
    const publicId = key.replace(/\.[^.]+$/, '');
    try {
      const uploaded = await uploadCloudinaryImage(body, {
        public_id: publicId,
        format: 'webp'
      });
      return {
        key: uploaded.public_id,
        url: cloudinaryImageUrl(uploaded.public_id)
      };
    } catch (error) {
      console.warn('Cloudinary image upload failed; using the configured media fallback:', error.message);
    }
  }

  return storePublicObject(key, body, 'image/webp');
}

export async function storeListingImage(file, listingId) {
  await validateUpload(file, ['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const key = `listings/${listingId}/${crypto.randomUUID()}.webp`;
  const body = await optimizeImageBuffer(file.buffer, {
    width: 1920,
    fit: 'inside',
    maxOutputBytes: MAX_LISTING_IMAGE_BYTES
  });
  return storePublicImage(key, body);
}

export async function storeListingVideo(file, listingId) {
  await validateUpload(file, ['video/mp4', 'video/webm']);
  const extension = file.mimetype === 'video/webm' ? 'webm' : 'mp4';
  const key = `listings/${listingId}/${crypto.randomUUID()}.${extension}`;
  return storePublicObject(key, file.buffer, file.mimetype);
}

export async function storeAgentProfileImage(file, userId) {
  await validateUpload(file, ['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const key = `agents/${userId}/profile/${crypto.randomUUID()}.webp`;
  const body = await optimizeImageBuffer(file.buffer, {
    width: 768,
    height: 768,
    fit: 'cover',
    maxOutputBytes: MAX_PROFILE_IMAGE_BYTES
  });
  return storePublicImage(key, body);
}

export async function storeUserProfileImage(file, userId) {
  await validateUpload(file, ['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const key = `users/${userId}/profile/${crypto.randomUUID()}.webp`;
  const body = await optimizeImageBuffer(file.buffer, {
    width: 768,
    height: 768,
    fit: 'cover',
    maxOutputBytes: MAX_PROFILE_IMAGE_BYTES
  });
  return storePublicImage(key, body);
}

export async function storePrivateDocument(file, userId) {
  await validateUpload(file, ['application/pdf', 'image/jpeg', 'image/png']);
  const isPdf = file.mimetype === 'application/pdf';
  const isImage = ['image/jpeg', 'image/png'].includes(file.mimetype);
  if (!isPdf && !isImage) throw new Error('Unsupported identity document');
  if (isImage) await sharp(file.buffer).metadata();
  const key = `identity/${userId}/${crypto.randomUUID()}.bin`;
  const encrypted = encryptBuffer(file.buffer);
  if (!canUseObjectStorage) {
    const filePath = path.join(localPrivateRoot, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, encrypted);
    return { key, encryptionVersion: 1 };
  }
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: encrypted,
    ContentType: 'application/octet-stream',
    ServerSideEncryption: 'AES256',
    Metadata: { private: 'true' }
  }));
  return { key, encryptionVersion: 1 };
}

export async function readPrivateDocument(key, encryptionVersion = 0) {
  const safeKey = String(key || '');
  if (!/^identity\/\d+\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.bin$/i.test(safeKey)) {
    const error = new Error('Private document not found');
    error.statusCode = 404;
    throw error;
  }
  const version = Number(encryptionVersion);
  if (version !== 0 && version !== 1) throw new Error('Unsupported private document encryption version');
  let contents;
  try {
    if (canUseObjectStorage) {
      const result = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: safeKey }));
      if (!result.Body) throw new Error('Private document storage returned an empty object');
      const chunks = [];
      for await (const chunk of result.Body) chunks.push(Buffer.from(chunk));
      contents = Buffer.concat(chunks);
    } else {
      const filePath = path.resolve(localPrivateRoot, safeKey);
      if (!filePath.startsWith(`${localPrivateRoot}${path.sep}`)) {
        const error = new Error('Private document not found');
        error.statusCode = 404;
        throw error;
      }
      contents = await readFile(filePath);
    }
  } catch (error) {
    if (error.code === 'ENOENT' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      error.statusCode = 404;
    }
    throw error;
  }
  const buffer = version === 1 ? decryptBuffer(contents) : contents;
  let contentType;
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') contentType = 'application/pdf';
  else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) contentType = 'image/jpeg';
  else if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) contentType = 'image/png';
  else throw new Error('Private document content is invalid');
  return { buffer, contentType };
}
