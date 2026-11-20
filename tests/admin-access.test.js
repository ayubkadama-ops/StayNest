import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canAccessAdminFeature } from '../server/admin-access.js';
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

test('public homepage does not expose an administrator navigation shortcut', async () => {
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const application = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.doesNotMatch(homepage, /href=["']\/admin\//i);
  assert.doesNotMatch(application, /brand\.addEventListener\(['"]dblclick['"]/i);
  assert.doesNotMatch(homepage, /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i);
});

test('homepage and all-listings search expose venue property filters', async () => {
  const [application, listingsPage, listingsTemplate] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../listings-page.js', import.meta.url), 'utf8'),
    readFile(new URL('../listings.html', import.meta.url), 'utf8'),
  ]);

  assert.match(application, /value:'venue',label:'Venues'/);
  assert.match(application, /<option value="venue">Venues<\/option>/);
  assert.match(application, /'commercial','venue'\]\.includes\(searchBy\)/);
  assert.match(listingsTemplate, /<option value="venue">Venues<\/option>/);
  assert.match(listingsPage, /venue:\s*\['Venues'/);
});

test('signup timestamps email as verified and sign-in has no verification gate', async () => {
  const [api, application] = await Promise.all([
    readFile(new URL('../server/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(api, /INSERT INTO users \(email,phone,password_hash,status,email_verified_at\)\s+VALUES \(\?,\?,\?,\?,UTC_TIMESTAMP\(\)\)/);
  assert.doesNotMatch(api, /emailVerificationRequired|requiresEmailVerification|require_email_verification/);
  assert.match(api, /app\.post\('\/api\/auth\/register', signupLimiter, identityDocumentUpload/);
  assert.match(api, /app\.post\('\/api\/auth\/google\/complete', identityDocumentUpload/);
  assert.match(application, /Identity verification \(required for owners and agents\)/);
  assert.match(application, /name="document" type="file"/);
});

test('content security policy disallows inline scripts and script attributes', () => {
  const directives = securityHeaders.contentSecurityPolicy.directives;

  assert.equal(directives.scriptSrc.includes("'unsafe-inline'"), false);
  assert.deepEqual(directives.scriptSrcAttr, ["'none'"]);
});
