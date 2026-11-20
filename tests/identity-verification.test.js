import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IdentityVerificationProvider,
  validateIdentityDocuments,
  validateIdentitySubmission
} from '../server/identity-verification.js';

test('identity verification accepts NIDA and passport submissions and rejects incomplete consent', () => {
  assert.deepEqual(validateIdentitySubmission({
    documentType: 'national_id',
    idNumber: '199012345678',
    fullName: 'Asha Mrema',
    dateOfBirth: '1990-12-12',
    consent: 'true'
  }), {
    value: {
      documentType: 'national_id',
      idNumber: '199012345678',
      fullName: 'Asha Mrema',
      dateOfBirth: '1990-12-12'
    }
  });
  assert.match(validateIdentitySubmission({
    documentType: 'passport',
    idNumber: 'AB123456',
    fullName: 'Asha Mrema',
    dateOfBirth: '1990-12-12',
    consent: false
  }).error, /Consent/i);
});

test('identity document uploads require a front image and selfie, plus the NIDA reverse', () => {
  const body = {
    documentType: 'national_id',
    idNumber: '199012345678',
    fullName: 'Asha Mrema',
    dateOfBirth: '1990-12-12',
    consent: 'true'
  };
  const document = { mimetype: 'image/jpeg' };
  const selfie = { mimetype: 'image/jpeg' };

  assert.match(validateIdentityDocuments(body, {}).error, /ID document and a selfie/);
  assert.match(validateIdentityDocuments(body, { document: [document], selfie: [selfie] }).error, /back of the NIDA/);
  const result = validateIdentityDocuments(body, {
    document: [document],
    backDocument: [{ mimetype: 'image/jpeg' }],
    selfie: [selfie]
  });
  assert.equal(result.error, undefined);
  assert.equal(result.value.document, document);
  assert.equal(result.value.documentCountry, null);

  const passport = validateIdentityDocuments({ ...body, documentType: 'passport' }, {
    document: [document],
    selfie: [selfie]
  });
  assert.equal(passport.error, undefined);
});

test('identity verification provider is manual-review by default', async () => {
  const provider = new IdentityVerificationProvider();
  assert.deepEqual(await provider.verify({ idNumber: 'masked' }), {
    status: 'manual_review',
    checked: false
  });
});
