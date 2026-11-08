export const SUPPORTED_ROLES = Object.freeze([
  'tenant',
  'property_owner',
  'agent',
  'agency',
  'developer',
  'verification_officer',
  'administrator'
]);

export const SELF_REGISTERABLE_ROLES = Object.freeze(['tenant', 'property_owner', 'agent']);
export const FOUNDER_ASSIGNED_ROLES = Object.freeze([
  'agency',
  'developer',
  'verification_officer',
  'administrator'
]);

const LISTING_MANAGER_ROLES = new Set(['property_owner', 'agency', 'developer']);
const LISTING_MANAGER_PERMISSIONS = new Set([
  'listings.create',
  'listings.manage',
  'bookings.view',
  'bookings.manage',
  'messages.send',
  'media.manage',
  'identity.manage',
  'profile.manage'
]);

export function isSupportedRole(role) {
  return SUPPORTED_ROLES.includes(role);
}

export function canAssignRole(role, { isFounder = false } = {}) {
  return isSupportedRole(role) && (isFounder || !FOUNDER_ASSIGNED_ROLES.includes(role));
}

export function hasListingRolePermission(user, permission) {
  return Array.isArray(user?.roles)
    && user.roles.some(role => LISTING_MANAGER_ROLES.has(role))
    && LISTING_MANAGER_PERMISSIONS.has(permission);
}
