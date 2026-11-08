import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeListingCategoryDetails,
  validateAdvertisingAuthorization
} from '../server/listing-category-details.js';

test('listing category details accept bounded structured data and reject unknown or oversized input', () => {
  assert.deepEqual(normalizeListingCategoryDetails('{"homeStyle":"Villa","floorLevel":3}'), {
    value: { homeStyle: 'Villa', floorLevel: 3 }
  });
  assert.match(normalizeListingCategoryDetails('{"privateOwnerId":"123"}').error, /Unknown property/);
  assert.match(normalizeListingCategoryDetails('x'.repeat(10_001)).error, /too large/);
});

test('advertising authority requires a valid declaration and explicit attestation', () => {
  assert.deepEqual(validateAdvertisingAuthorization({
    authorization: 'authorized_agent',
    notes: 'Owner gave written permission',
    attested: 'true'
  }), {
    value: { authorization: 'authorized_agent', notes: 'Owner gave written permission' }
  });
  assert.match(validateAdvertisingAuthorization({
    authorization: 'owner',
    attested: false
  }).error, /Confirm that you own/);
  assert.match(validateAdvertisingAuthorization({
    authorization: 'identity_verified',
    attested: true
  }).error, /Choose how you are authorized/);
});
