import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessAdminFeature } from '../server/admin-access.js';

test('founder retains full access independently of delegated grants', () => {
  assert.equal(canAccessAdminFeature({
    isFounder: true,
    hasProfile: true,
    grantedFeatures: [],
  }, 'settings'), true);
});

test('legacy administrators without a profile retain existing access', () => {
  assert.equal(canAccessAdminFeature({
    isFounder: false,
    hasProfile: false,
    grantedFeatures: [],
  }, 'users'), true);
});

test('restricted administrators receive only explicitly granted features', () => {
  const permissions = {
    isFounder: false,
    hasProfile: true,
    grantedFeatures: ['listings'],
  };

  assert.equal(canAccessAdminFeature(permissions, 'listings'), true);
  assert.equal(canAccessAdminFeature(permissions, 'users'), false);
  assert.equal(canAccessAdminFeature(permissions, 'unknown'), false);
});
