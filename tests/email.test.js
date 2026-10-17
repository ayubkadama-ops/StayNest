import assert from 'node:assert/strict';
import test from 'node:test';
import { renderBrandedEmail, sendBrandedEmail } from '../server/email.js';

function withEmailEnvironment(t, values) {
  const keys = ['RESEND_API_KEY', 'RESEND_FROM', 'EMAIL_API_URL', 'EMAIL_API_KEY', 'EMAIL_FROM', 'PUBLIC_APP_URL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, values);
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

test('branded mail escapes content and uses the configured public app origin', () => {
  process.env.PUBLIC_APP_URL = 'https://makazi.example/';
  const html = renderBrandedEmail({
    title: 'Verify <email>',
    text: 'Hello <Tenant>',
    actionUrl: 'https://makazi.example/verify?token=a&next=b',
    actionLabel: 'Verify email'
  });

  assert.match(html, /Makazi Go/);
  assert.match(html, /https:\/\/makazi\.example\/assets\/makazi-go-icon\.png/);
  assert.match(html, /Verify &lt;email&gt;/);
  assert.match(html, /Hello &lt;Tenant&gt;/);
  assert.match(html, /token=a&amp;next=b/);
});

test('Resend delivery sends branded HTML, text, and recipient', async t => {
  withEmailEnvironment(t, {
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM: 'Makazi Go <mail@example.test>',
    PUBLIC_APP_URL: 'https://makazi.example'
  });
  let capturedUrl;
  let capturedRequest;
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    capturedUrl = url;
    capturedRequest = request;
    return new Response('{"id":"email_test_123"}', { status: 200 });
  });

  const sent = await sendBrandedEmail({
    to: 'tenant@example.test',
    subject: 'Verify your email',
    text: 'Confirm your Makazi Go email.',
    actionUrl: 'https://makazi.example/index.html?verifyEmail=test-token',
    actionLabel: 'Verify email'
  });

  assert.equal(sent, true);
  assert.equal(capturedUrl, 'https://api.resend.com/emails');
  assert.equal(capturedRequest.headers.Authorization, 'Bearer re_test_key');
  const payload = JSON.parse(capturedRequest.body);
  assert.equal(payload.from, 'Makazi Go <mail@example.test>');
  assert.deepEqual(payload.to, ['tenant@example.test']);
  assert.equal(payload.subject, 'Verify your email');
  assert.equal(payload.text, 'Confirm your Makazi Go email.');
  assert.match(payload.html, /Verify email/);
});

test('email delivery safely reports unconfigured provider', async t => {
  withEmailEnvironment(t, {});
  assert.equal(await sendBrandedEmail({ to: 'tenant@example.test', subject: 'Notice', text: 'Test' }), false);
});
