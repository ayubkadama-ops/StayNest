import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT)
});
const localMediaRoot = path.resolve(process.cwd(), 'storage', 'media');
const localPrivateRoot = path.resolve(process.cwd(), 'storage', 'private');
const canUseObjectStorage = Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

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
  if (!file || !allowedTypes.includes(file.mimetype) || !hasFileSignature(file)) {
    throw new Error('File content does not match its declared type');
  }
  if (file.mimetype.startsWith('image/')) await sharp(file.buffer).metadata();
  return file;
}

async function storePublicObject(key, body, contentType) {
  if (!canUseObjectStorage) {
    const filePath = path.join(localMediaRoot, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    return { key, url: `/media/${key.split('/').map(encodeURIComponent).join('/')}` };
  }
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public,max-age=31536000,immutable',
    ServerSideEncryption: 'AES256'
  }));
  return { key, url: `${process.env.S3_PUBLIC_BASE_URL}/${key}` };
}

export async function storeListingImage(file, listingId) {
  await validateUpload(file, ['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const key = `listings/${listingId}/${crypto.randomUUID()}.webp`;
  const body = await sharp(file.buffer)
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return storePublicObject(key, body, 'image/webp');
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
  const body = await sharp(file.buffer)
    .rotate()
    .resize({ width: 800, height: 800, fit: 'cover' })
    .webp({ quality: 84 })
    .toBuffer();
  return storePublicObject(key, body, 'image/webp');
}

export async function storeUserProfileImage(file, userId) {
  await validateUpload(file, ['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const key = `users/${userId}/profile/${crypto.randomUUID()}.webp`;
  const body = await sharp(file.buffer)
    .rotate()
    .resize({ width: 800, height: 800, fit: 'cover' })
    .webp({ quality: 84 })
    .toBuffer();
  return storePublicObject(key, body, 'image/webp');
}

export async function storePrivateDocument(file, userId) {
  await validateUpload(file, ['application/pdf', 'image/jpeg', 'image/png']);
  const isPdf = file.mimetype === 'application/pdf';
  const isImage = ['image/jpeg', 'image/png'].includes(file.mimetype);
  if (!isPdf && !isImage) throw new Error('Unsupported identity document');
  if (isImage) await sharp(file.buffer).metadata();
  const key = `identity/${userId}/${crypto.randomUUID()}.bin`;
  if (!canUseObjectStorage) {
    const filePath = path.join(localPrivateRoot, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);
    return { key };
  }
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: 'application/octet-stream',
    ServerSideEncryption: 'AES256',
    Metadata: { private: 'true' }
  }));
  return { key };
}
