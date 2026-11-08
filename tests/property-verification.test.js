import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROPERTY_VERIFICATION_CHECKS,
  resetPropertyLocationChecks,
  resolvePropertyVerificationStatus,
  validatePropertyVerificationDecision
} from '../server/property-verification.js';

const blankChecks = () => Object.fromEntries(PROPERTY_VERIFICATION_CHECKS.map(key => [key, 'not_reviewed']));

test('property verification requires all four independent checks', () => {
  const checks = blankChecks();
  assert.equal(resolvePropertyVerificationStatus(checks), 'submitted');
  checks.identity_status = 'checked';
  assert.equal(resolvePropertyVerificationStatus(checks), 'under_review');
  checks.location_status = 'checked';
  checks.authority_status = 'checked';
  assert.equal(resolvePropertyVerificationStatus(checks), 'under_review');
  checks.documents_status = 'checked';
  assert.equal(resolvePropertyVerificationStatus(checks), 'verified');
});

test('a rejected property check prevents verification even when other checks pass', () => {
  const checks = Object.fromEntries(PROPERTY_VERIFICATION_CHECKS.map(key => [key, 'checked']));
  checks.authority_status = 'rejected';
  assert.equal(resolvePropertyVerificationStatus(checks), 'rejected');
});

test('location edits restart property-specific checks but preserve advertiser identity review', () => {
  const result = resetPropertyLocationChecks({
    identity_status: 'checked',
    location_status: 'checked',
    authority_status: 'checked',
    documents_status: 'checked'
  });

  assert.deepEqual(result, {
    checks: {
      identity_status: 'checked',
      location_status: 'not_reviewed',
      authority_status: 'not_reviewed',
      documents_status: 'not_reviewed'
    },
    status: 'under_review'
  });
});

test('property verification decisions validate check, status, and rejection reason', () => {
  assert.deepEqual(validatePropertyVerificationDecision({
    check: 'location_status',
    status: 'checked'
  }), { check: 'location_status', status: 'checked', reason: null });
  assert.match(validatePropertyVerificationDecision({
    check: 'ownership',
    status: 'checked'
  }).error, /valid property verification check/i);
  assert.match(validatePropertyVerificationDecision({
    check: 'authority_status',
    status: 'rejected'
  }).error, /reason/i);
  assert.match(validatePropertyVerificationDecision({
    check: 'authority_status',
    status: 'rejected',
    reason: 'x'.repeat(501)
  }).error, /500 characters/i);
});
