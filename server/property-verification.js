export const PROPERTY_VERIFICATION_CHECKS = Object.freeze([
  'identity_status',
  'location_status',
  'authority_status',
  'documents_status'
]);

export const PROPERTY_VERIFICATION_VALUES = Object.freeze(['checked', 'rejected']);

export function resolvePropertyVerificationStatus(checks) {
  if (PROPERTY_VERIFICATION_CHECKS.some(key => checks[key] === 'rejected')) return 'rejected';
  if (PROPERTY_VERIFICATION_CHECKS.every(key => checks[key] === 'checked')) return 'verified';
  if (PROPERTY_VERIFICATION_CHECKS.some(key => checks[key] === 'checked')) return 'under_review';
  return 'submitted';
}

export function resetPropertyLocationChecks(checks = {}) {
  const identityStatus = ['not_reviewed', 'checked', 'rejected'].includes(checks.identity_status)
    ? checks.identity_status
    : 'not_reviewed';
  const nextChecks = {
    identity_status: identityStatus,
    location_status: 'not_reviewed',
    authority_status: 'not_reviewed',
    documents_status: 'not_reviewed'
  };
  return {
    checks: nextChecks,
    status: resolvePropertyVerificationStatus(nextChecks)
  };
}

export function validatePropertyVerificationDecision(body) {
  const check = typeof body?.check === 'string' ? body.check : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (!PROPERTY_VERIFICATION_CHECKS.includes(check)) return { error: 'Choose a valid property verification check' };
  if (!PROPERTY_VERIFICATION_VALUES.includes(status)) return { error: 'Choose checked or rejected for this verification' };
  if (status === 'rejected' && !reason) return { error: 'Enter a reason when rejecting a verification check' };
  if (reason.length > 500) return { error: 'Verification reason must be 500 characters or fewer' };
  return { check, status, reason: reason || null };
}
