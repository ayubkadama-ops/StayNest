import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCloudinaryConfigured, cloudinary } from '../server/cloudinary.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const supportedImage = /\.(?:avif|jpe?g|png|svg|webp)$/i;

async function listImages(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listImages(path.join(directory, entry.name), relativePath));
    else if (entry.isFile() && supportedImage.test(entry.name)) files.push(relativePath);
  }
  return files;
}

if (!isCloudinaryConfigured) {
  console.warn('Cloudinary asset sync skipped: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable it');
  process.exit(0);
}

const files = await listImages(root);
for (let index = 0; index < files.length; index += 4) {
  const batch = files.slice(index, index + 4);
  await Promise.all(batch.map(async relativePath => {
    const filePath = path.join(root, relativePath);
    const publicId = `site-assets/${relativePath.replace(/\.[^.]+$/, '')}`;
    await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'image'
    });
  }));
  console.log(`Uploaded ${Math.min(index + batch.length, files.length)} of ${files.length} bundled images`);
}