import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);
export const isCloudinaryDeliveryConfigured = Boolean(cloudName);
export { cloudinary };

export function cloudinaryAssetPublicId(assetPath) {
  const normalized = String(assetPath || '').replaceAll('\\', '/');
  const match = normalized.match(/^\/?assets\/(.+)\.(avif|jpe?g|png|svg|webp)$/i);
  if (!match || match[1].split('/').some(part => !part || part === '.' || part === '..')) return null;
  return `site-assets/${match[1]}`;
}

export function cloudinaryImageUrl(publicId, configuredCloudName = cloudName) {
  if (!configuredCloudName) return null;
  return cloudinary.url(publicId, {
    cloud_name: configuredCloudName,
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    version: false
  }).replace('/vfalse/', '/');
}

export function uploadCloudinaryImage(buffer, options) {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary image storage is not configured');
  }

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream({
      resource_type: 'image',
      overwrite: true,
      ...options
    }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    upload.end(buffer);
  });
}

export function cloudinaryAssetUrl(assetPath, configuredCloudName = cloudName) {
  const publicId = cloudinaryAssetPublicId(assetPath);
  return publicId ? cloudinaryImageUrl(publicId, configuredCloudName) : assetPath;
}