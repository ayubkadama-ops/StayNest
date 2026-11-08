import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAssignRole,
  hasListingRolePermission,
  isSupportedRole
} from '../server/role-matrix.js';
import {
  normalizeAgentServiceAreas,
  normalizeAgentSpecializations,
  parseAgentProfileList
} from '../server/agent-profile.js';

test('role matrix exposes supported roles and keeps sensitive role assignment founder-only', () => {
  assert.equal(isSupportedRole('property_owner'), true);
  assert.equal(isSupportedRole('verification_officer'), true);
  assert.equal(isSupportedRole('unknown'), false);
  assert.equal(canAssignRole('property_owner'), true);
  assert.equal(canAssignRole('verification_officer'), false);
  assert.equal(canAssignRole('verification_officer', { isFounder: true }), true);
});

test('property owners and organizations receive only listing-workspace permissions', () => {
  assert.equal(hasListingRolePermission({ roles: ['property_owner'] }, 'listings.create'), true);
  assert.equal(hasListingRolePermission({ roles: ['agency'] }, 'bookings.manage'), true);
  assert.equal(hasListingRolePermission({ roles: ['developer'] }, 'admin.users'), false);
  assert.equal(hasListingRolePermission({ roles: ['tenant'] }, 'listings.create'), false);
});

test('professional specializations reject unknown claims and service areas are bounded and deduplicated', () => {
  assert.deepEqual(normalizeAgentSpecializations(['land', 'land']), { value: ['land'] });
  assert.match(normalizeAgentSpecializations(['unverified_sales']).error, /listed professional specializations/);
  assert.deepEqual(normalizeAgentServiceAreas(['Dar es Salaam', ' dar   es salaam ', 'Arusha']), {
    value: ['Dar es Salaam', 'Arusha']
  });
  assert.match(normalizeAgentServiceAreas(['x'.repeat(101)]).error, /100 characters/);
  assert.deepEqual(parseAgentProfileList('["land","commercial"]'), ['land', 'commercial']);
});
