export function seoSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function listingCanonicalPath(listing) {
  const id = Number(listing?.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('A valid listing ID is required for its canonical URL.');
  return `/properties/${seoSlug(listing.title) || 'property'}-${id}/`;
}
