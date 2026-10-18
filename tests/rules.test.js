import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { approximateListingCoordinates, calculateBooking, datesOverlap, hasAgentPermission, hasRole, isActiveSubAgent, isListingAvailable, resolvePropertyType, verifyWebhookSignature } from '../server/rules.js';
import { hasFileSignature, MAX_IMAGE_UPLOAD_BYTES, optimizeImageBuffer, validateUpload } from '../server/storage.js';
import { cloudinaryAssetPublicId, cloudinaryAssetUrl } from '../server/cloudinary.js';
import { boundedPage, isValidDate, positiveId, registrationDetails } from '../server/validation.js';
import sharp from 'sharp';

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

test('agent actions honor sub-agent permissions while main agents retain access', () => {
  assert.equal(hasAgentPermission({ roles: ['agent'], isSubAgent: true, permissions: ['bookings.view'] }, 'bookings.view'), true);
  assert.equal(hasAgentPermission({ roles: ['agent'], isSubAgent: true, permissions: ['bookings.view'] }, 'bookings.manage'), false);
  assert.equal(hasAgentPermission({ roles: ['agent'], isSubAgent: false, permissions: [] }, 'bookings.manage'), true);
  assert.equal(hasAgentPermission({ roles: ['tenant'], isSubAgent: true, permissions: ['bookings.manage'] }, 'bookings.manage'), false);
});

test('sub-agent access requires an active link and active user account', () => {
  assert.equal(isActiveSubAgent({ status: 'active', userStatus: 'active' }), true);
  assert.equal(isActiveSubAgent({ status: 'revoked', userStatus: 'active' }), false);
  assert.equal(isActiveSubAgent({ status: 'active', userStatus: 'suspended' }), false);
  assert.equal(isActiveSubAgent(null), false);
});

test('listing structures resolve to searchable property categories', () => {
  assert.equal(resolvePropertyType(undefined, 'land_plot'), 'land');
  assert.equal(resolvePropertyType(undefined, 'hotel'), 'hotel');
  assert.equal(resolvePropertyType(undefined, 'commercial'), 'commercial');
  assert.equal(resolvePropertyType('hotel', 'guesthouse'), 'hotel');
});

test('public listing coordinates are rounded and invalid coordinates are omitted', () => {
  assert.deepEqual(approximateListingCoordinates(-6.82341, 39.2198), { latitude: -6.82, longitude: 39.22 });
  assert.deepEqual(approximateListingCoordinates(-0.001, 0.001), { latitude: 0, longitude: 0 });
  assert.equal(approximateListingCoordinates(null, 39.2), null);
  assert.equal(approximateListingCoordinates(-91, 39.2), null);
});

test('availability rejects a date that is already locked', () => {
  assert.equal(isListingAvailable(['2026-10-10', '2026-10-11'], ['2026-10-12']), true);
  assert.equal(isListingAvailable(['2026-10-10', '2026-10-11'], ['2026-10-11']), false);
});

test('upload signatures are checked independently from MIME declarations', () => {
  assert.equal(hasFileSignature({ mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }), true);
  assert.equal(hasFileSignature({ mimetype: 'image/png', buffer: Buffer.from('not an image') }), false);
});

test('invalid image uploads produce a client error instead of an internal server error', async () => {
  await assert.rejects(
    validateUpload({ mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) }, ['image/jpeg']),
    error => error.statusCode === 400 && error.message === 'The uploaded image is invalid or corrupted'
  );
});

test('oversized image uploads are rejected with a payload-too-large response', async () => {
  await assert.rejects(
    validateUpload({ mimetype: 'image/jpeg', buffer: Buffer.alloc(MAX_IMAGE_UPLOAD_BYTES + 1) }, ['image/jpeg']),
    error => error.statusCode === 413 && /20 MB/.test(error.message)
  );
});

test('listing image optimization bounds output dimensions and encoded size', async () => {
  const source = await sharp({ create: { width: 8000, height: 6000, channels: 3, background: '#3b765d' } }).jpeg().toBuffer();
  await validateUpload({ mimetype: 'image/jpeg', buffer: source }, ['image/jpeg']);
  const optimized = await optimizeImageBuffer(source, { width: 1920, fit: 'inside', maxOutputBytes: 2 * 1024 * 1024 });
  const metadata = await sharp(optimized).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1920);
  assert.ok(optimized.length <= 2 * 1024 * 1024);
});

test('image optimization reports unsupported/corrupt data as a client error', async () => {
  await assert.rejects(
    optimizeImageBuffer(Buffer.from('not an image'), { width: 1920, fit: 'inside', maxOutputBytes: 4 * 1024 * 1024 }),
    error => error.statusCode === 400 && /could not be decoded/.test(error.message)
  );
});

test('Cloudinary asset URLs use stable safe IDs and automatic delivery transforms', () => {
  assert.equal(cloudinaryAssetPublicId('/assets/makazi-category-home.webp'), 'site-assets/makazi-category-home');
  assert.equal(cloudinaryAssetPublicId('/assets/../private.jpg'), null);
  assert.match(cloudinaryAssetUrl('/assets/makazi-category-home.webp', 's9p5ymwd'), /^https:\/\/res\.cloudinary\.com\/s9p5ymwd\/image\/upload\/f_auto,q_auto\/site-assets\/makazi-category-home/);
  assert.equal(cloudinaryAssetUrl('/assets/makazi-category-home.webp', ''), null);
});

test('pagination and IDs are bounded', () => {
  assert.deepEqual(boundedPage({ page: '2', limit: '500' }), { page: 2, limit: 100, offset: 100 });
  assert.equal(positiveId('12'), 12);
  assert.equal(positiveId('-1'), null);
});

test('signup profile details are normalized for tenant and agent records', () => {
  assert.deepEqual(registrationDetails({ phone: ' +255 700 123 456 ', city: ' Dar es Salaam ', agencyName: ' Makazi Realty ', bio: ' Local agent ' }), {
    phone: '+255 700 123 456', city: 'Dar es Salaam', agencyName: 'Makazi Realty', bio: 'Local agent', error: ''
  });
  assert.equal(registrationDetails({ phone: 'not a phone' }).error, 'Enter a valid phone number');
});

test('date validation rejects impossible calendar dates', () => {
  assert.equal(isValidDate('2026-02-28'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(isValidDate('2025-02-29'), false);
});
