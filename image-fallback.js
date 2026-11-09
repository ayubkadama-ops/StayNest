const DEFAULT_IMAGE_FALLBACK = '/assets/ezgif-frame-018.jpg';
const installedDocuments = new WeakSet();

export function applyImageFallback(image) {
  const isAvatar = image?.matches?.('[data-profile-avatar], #agentProfileAvatar, #tenantProfileAvatar, .agent-page-avatar, .agent-profile-avatar')
    || image?.closest?.('.search-result[data-agent-id]');
  const fallback = image?.dataset?.imageFallback || (isAvatar ? '' : DEFAULT_IMAGE_FALLBACK);
  if (image?.tagName !== 'IMG' || image.dataset.imageFallbackApplied === 'true'
    || (!fallback && image.dataset.hideOnImageError !== 'true')) return false;
  image.dataset.imageFallbackApplied = 'true';
  if (image.dataset.hideOnImageError === 'true') {
    image.hidden = true;
    return true;
  }
  image.src = fallback;
  return true;
}

export function installImageFallbacks(doc = document) {
  if (installedDocuments.has(doc)) return;
  installedDocuments.add(doc);
  doc.addEventListener('error', event => applyImageFallback(event.target), true);
}
