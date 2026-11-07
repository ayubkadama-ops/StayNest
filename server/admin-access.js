export const ADMIN_ACCESS_FEATURES = Object.freeze([
  'overview',
  'users',
  'access',
  'agents',
  'listings',
  'posts',
  'badges',
  'bookings',
  'verifications',
  'reports',
  'audit',
  'settings',
  'analytics',
]);

export function canAccessAdminFeature({ isFounder, hasProfile, grantedFeatures }, feature) {
  if (isFounder || !hasProfile) return true;
  return ADMIN_ACCESS_FEATURES.includes(feature) && grantedFeatures.includes(feature);
}
