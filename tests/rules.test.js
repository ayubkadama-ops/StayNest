import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { calculateBooking, datesOverlap, hasRole, isListingAvailable, verifyWebhookSignature } from '../server/rules.js';
import { hasFileSignature } from '../server/storage.js';
import { boundedPage, isValidDate, positiveId } from '../server/validation.js';

test('date overlap detects intersecting stays but permits checkout/check-in boundary', () => {
  assert.equal(datesOverlap('2026-10-10', '2026-10-15', '2026-10-12', '2026-10-18'), true);
  assert.equal(datesOverlap('2026-10-10', '2026-10-15', '2026-10-15', '2026-10-18'), false);
});

test('booking calculation applies nights, cleaning fee, and minimum stay', () => {
  assert.deepEqual(calculateBooking({ nightlyPrice: 80, cleaningFee: 20, checkIn: '2026-10-10', checkOut: '2026-10-13', minimumNights: 2 }), { nights: 3, subtotal: 240, total: 260 });
  assert.throws(() => calculateBooking({ nightlyPrice: 80, checkIn: '2026-10-10', checkOut: '2026-10-11', minimumNights: 2 }));
});

test('payment signatures are verified with timing-safe comparison', () => {
  const payload = Buffer.from('{"id":"evt_1"}');
  const signature = crypto.createHmac('sha256', 'secret').update(payload).digest('hex');
  assert.equal(verifyWebhookSignature(payload, signature, 'secret'), true);
  assert.equal(verifyWebhookSignature(payload, signature.slice(0, -1) + '0', 'secret'), false);
});

test('permissions require an exact assigned role', () => {
  assert.equal(hasRole(['tenant', 'agent'], 'agent'), true);
  assert.equal(hasRole(['tenant'], 'administrator'), false);
});

test('availability rejects a date that is already locked', () => {
  assert.equal(isListingAvailable(['2026-10-10', '2026-10-11'], ['2026-10-12']), true);
  assert.equal(isListingAvailable(['2026-10-10', '2026-10-11'], ['2026-10-11']), false);
});

test('upload signatures are checked independently from MIME declarations', () => {
  assert.equal(hasFileSignature({ mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }), true);
  assert.equal(hasFileSignature({ mimetype: 'image/png', buffer: Buffer.from('not an image') }), false);
});

test('pagination and IDs are bounded', () => {
  assert.deepEqual(boundedPage({ page: '2', limit: '500' }), { page: 2, limit: 100, offset: 100 });
  assert.equal(positiveId('12'), 12);
  assert.equal(positiveId('-1'), null);
});

test('date validation rejects impossible calendar dates', () => {
  assert.equal(isValidDate('2026-02-28'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(isValidDate('2025-02-29'), false);
});
