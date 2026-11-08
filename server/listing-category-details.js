const CATEGORY_DETAIL_KEYS = new Set([
  'homeStyle', 'outdoorSpace', 'parking',
  'apartmentStyle', 'floorLevel', 'buildingAccess', 'balcony',
  'roomFurnishing', 'sharedSpaces', 'roomAccess',
  'plotSize', 'plotSizeUnit', 'landUse', 'titleStatus',
  'guestRooms', 'mealService', 'receptionHours',
  'housekeeping', 'utilitiesIncluded', 'kitchenSetup',
  'hotelRooms', 'floorArea', 'businessUse', 'customerAccess', 'loadingAccess'
]);

export function normalizeListingCategoryDetails(value) {
  if (value === undefined || value === null || value === '') return { value: {} };
  let details = value;
  if (typeof value === 'string') {
    if (value.length > 10_000) return { error: 'Category details are too large' };
    try { details = JSON.parse(value); } catch { return { error: 'Provide valid structured category details' }; }
  }
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return { error: 'Provide valid structured category details' };
  }
  const entries = Object.entries(details);
  if (entries.length > CATEGORY_DETAIL_KEYS.size) return { error: 'Too many category details were provided' };
  const normalized = {};
  for (const [key, value] of entries) {
    if (!CATEGORY_DETAIL_KEYS.has(key)) return { error: 'Unknown property category detail' };
    if (typeof value === 'string') {
      const cleanValue = value.trim();
      if (cleanValue.length > 500) return { error: 'Each category detail must be 500 characters or fewer' };
      if (cleanValue) normalized[key] = cleanValue;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[key] = value;
    } else if (value !== null && value !== undefined && value !== '') {
      return { error: 'Category details must be text or numeric values' };
    }
  }
  return { value: normalized };
}

export function validateAdvertisingAuthorization({ authorization, notes, attested }) {
  if (!['owner', 'authorized_agent', 'agency', 'other'].includes(authorization)) {
    return { error: 'Choose how you are authorized to advertise this property' };
  }
  const authorizationNotes = String(notes || '').trim();
  if (authorizationNotes.length > 500) return { error: 'Authorization notes must be 500 characters or fewer' };
  if (![true, 'true', 'on', '1', 1].includes(attested)) {
    return { error: 'Confirm that you own or are authorized to advertise this property' };
  }
  return { value: { authorization, notes: authorizationNotes || null } };
}
