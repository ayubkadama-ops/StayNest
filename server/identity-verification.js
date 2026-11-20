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

export function validateIdentityDocuments(body, files) {
  const document = files?.document?.[0];
  const backDocument = files?.backDocument?.[0];
  const selfie = files?.selfie?.[0];
  if (!document || !selfie) return { error: 'Add the ID document and a selfie holding the ID' };
  if (body?.documentType === 'national_id' && !backDocument) {
    return { error: 'Add the back of the NIDA document' };
  }
  const submission = validateIdentitySubmission(body);
  if (submission.error) return submission;
  return {
    value: {
      ...submission.value,
      document,
      backDocument,
      selfie,
      documentCountry: String(body.documentCountry || '').trim().slice(0, 2).toUpperCase() || null
    }
  };
}

export class IdentityVerificationProvider {
  async verify(_submission) {
    return { status: 'manual_review', checked: false };
  }
}
