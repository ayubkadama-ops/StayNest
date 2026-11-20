import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IdentityVerificationProvider,
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

test('identity verification provider is manual-review by default', async () => {
  const provider = new IdentityVerificationProvider();
  assert.deepEqual(await provider.verify({ idNumber: 'masked' }), {
    status: 'manual_review',
    checked: false
  });
});
