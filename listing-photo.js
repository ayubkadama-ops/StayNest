const PHOTO_EXTENSIONS = Object.freeze({
  'image/avif': 'avif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
});

export async function prepareListingPhoto(file, maxOptimizedPhotoBytes = 3 * 1024 * 1024) {
  let bitmap = null;
  let image = null;
  let objectUrl = '';
  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(file);
    } catch {}
  }
  if (!bitmap) {
    objectUrl = URL.createObjectURL(file);
    image = new Image();
    try {
      image.src = objectUrl;
      await image.decode();
    } catch {
      URL.revokeObjectURL(objectUrl);
      return file;
    }
  }
  const source = bitmap || image;
  const sourceWidth = bitmap?.width || image.naturalWidth;
  const sourceHeight = bitmap?.height || image.naturalHeight;
  try {
    if (file.size <= maxOptimizedPhotoBytes && sourceWidth <= 1920 && sourceHeight <= 1920) return file;
    for (const maxDimension of [1920, 1600, 1280]) {
      const scale = Math.min(1, maxDimension / sourceWidth, maxDimension / sourceHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo processing is not available in this browser.');
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.72, 0.62]) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        const extension = blob && PHOTO_EXTENSIONS[blob.type.toLowerCase()];
        if (blob && extension && blob.size <= maxOptimizedPhotoBytes) {
          const name = file.name.replace(/\.[^.]+$/, '') || 'listing-photo';
          return new File([blob], `${name}.${extension}`, {
            type: blob.type,
            lastModified: file.lastModified
          });
        }
      }
    }
    throw new Error(`${file.name} could not be reduced to 3 MB. Choose a smaller photo.`);
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
