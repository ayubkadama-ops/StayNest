export function bedroomSummary(listing) {
  const count = Number(listing.bedrooms) || 0;
  return listing.propertyType === 'apartment' && count === 0
    ? 'Studio'
    : `${count} bedroom${count === 1 ? '' : 's'}`;
}
