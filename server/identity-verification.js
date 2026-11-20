export const IDENTITY_VERIFICATION_STATUSES = Object.freeze([
  'unverified',
  'pending',
  'approved',
  'rejected',
  'needs_resubmission'
]);

export function validateIdentitySubmission(body) {
  const documentType = String(body?.documentType || '').trim();
  const idNumber = String(body?.idNumber || '').trim();
  const fullName = String(body?.fullName || '').trim();
  const dateOfBirth = String(body?.dateOfBirth || '').trim();
  if (!['national_id', 'passport'].includes(documentType)) return { error: 'Choose NIDA or passport verification' };
  if (!idNumber || idNumber.length > 40) return { error: 'Enter a valid ID number' };
  if (!fullName || fullName.length > 160) return { error: 'Enter the full name shown on the ID' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return { error: 'Enter the date of birth shown on the ID' };
  if (body?.consent !== 'true' && body?.consent !== true) return { error: 'Consent is required to process identity documents' };
  return { value: { documentType, idNumber, fullName, dateOfBirth } };
}

export class IdentityVerificationProvider {
  async verify(_submission) {
    return { status: 'manual_review', checked: false };
  }
}
