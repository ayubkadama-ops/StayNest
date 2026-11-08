import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canAccessAdminFeature } from '../server/admin-access.js';
import { isEmailVerificationRequired } from '../server/email-verification-policy.js';
import { securityHeaders } from '../server/security-headers.js';

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

test('email verification defaults to required and accepts explicit disable values', () => {
  assert.equal(isEmailVerificationRequired(undefined), true);
  assert.equal(isEmailVerificationRequired(null), true);
  assert.equal(isEmailVerificationRequired('1'), true);
  assert.equal(isEmailVerificationRequired('0'), false);
  assert.equal(isEmailVerificationRequired(0), false);
  assert.equal(isEmailVerificationRequired(false), false);
});

test('public homepage does not expose an administrator navigation shortcut', async () => {
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const application = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.doesNotMatch(homepage, /href=["']\/admin\//i);
  assert.doesNotMatch(application, /brand\.addEventListener\(['"]dblclick['"]/i);
  assert.doesNotMatch(homepage, /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i);
});

test('content security policy disallows inline scripts and script attributes', () => {
  const directives = securityHeaders.contentSecurityPolicy.directives;

  assert.equal(directives.scriptSrc.includes("'unsafe-inline'"), false);
  assert.deepEqual(directives.scriptSrcAttr, ["'none'"]);
});
