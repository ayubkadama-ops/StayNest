import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { approximateListingCoordinates, calculateBooking, datesOverlap, hasAgentPermission, hasRole, ipMatchesNetwork, isActiveSubAgent, isListingAvailable, isValidIpNetwork, resolvePropertyType, validateListingJourney, verifyWebhookSignature, withPublicListingCoordinates } from '../server/rules.js';
import { hasFileSignature, MAX_IMAGE_UPLOAD_BYTES, optimizeImageBuffer, validateUpload } from '../server/storage.js';
import { cloudinaryAssetPublicId, cloudinaryAssetUrl } from '../server/cloudinary.js';
import { boundedPage, isValidDate, positiveId, registrationDetails } from '../server/validation.js';
import { decryptBuffer, encryptBuffer } from '../server/crypto.js';
import sharp from 'sharp';

test('private document encryption preserves binary content and rejects tampering', () => {
  const original = Buffer.from([0x00, 0xff, 0x89, 0x50, 0x4e, 0x47]);
  const encrypted = encryptBuffer(original);
  assert.deepEqual(decryptBuffer(encrypted), original);
  encrypted[encrypted.length - 1] ^= 0xff;
  assert.throws(() => decryptBuffer(encrypted));
});

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

test('administrator IP rules match exact addresses and CIDR masks accurately', () => {
  assert.equal(ipMatchesNetwork('192.0.2.19', '192.0.2.19'), true);
  assert.equal(ipMatchesNetwork('192.0.2.20', '192.0.2.19'), false);
  assert.equal(ipMatchesNetwork('192.168.1.129', '192.168.1.129/25'), true);
  assert.equal(ipMatchesNetwork('192.168.1.127', '192.168.1.129/25'), false);
  assert.equal(ipMatchesNetwork('::ffff:192.0.2.19', '192.0.2.0/24'), true);
  assert.equal(ipMatchesNetwork('2001:db8:abcd::5', '2001:db8:abcd::/48'), true);
  assert.equal(ipMatchesNetwork('2001:db8:abce::5', '2001:db8:abcd::/48'), false);
});

test('administrator IP rules reject malformed addresses and prefixes', () => {
  assert.equal(isValidIpNetwork('192.0.2.1/32'), true);
  assert.equal(isValidIpNetwork('2001:db8::1/128'), true);
  assert.equal(isValidIpNetwork('192.0.2.1/33'), false);
  assert.equal(isValidIpNetwork('2001:db8::1/129'), false);
  assert.equal(isValidIpNetwork('192.0.2.1/not-a-prefix'), false);
  assert.equal(ipMatchesNetwork('192.0.2.1', 'not-an-ip'), false);
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

test('listing journeys enforce dedicated sale, rental, and stay prices', () => {
  assert.equal(validateListingJourney({
    transactionType: 'sale',
    structureType: 'house',
    salePrice: '180000000'
  }).transactionType, 'sale');
  assert.equal(validateListingJourney({
    transactionType: 'rent',
    structureType: 'apartment',
    monthlyPrice: '950000'
  }).transactionType, 'rent');
  assert.equal(validateListingJourney({
    transactionType: 'stay',
    structureType: 'hotel',
    nightlyPrice: '120000',
    rentalMode: 'short_term'
  }).transactionType, 'stay');
  assert.match(validateListingJourney({
    transactionType: 'sale',
    structureType: 'house',
    salePrice: '180000000',
    monthlyPrice: '950000'
  }).error, /cannot include rental prices/);
  assert.match(validateListingJourney({
    transactionType: 'rent',
    structureType: 'apartment',
    nightlyPrice: '120000',
    monthlyPrice: '950000'
  }).error, /monthly or yearly price only/);
  assert.match(validateListingJourney({
    transactionType: 'stay',
    structureType: 'land_plot',
    nightlyPrice: '120000'
  }).error, /only be listed for sale or long-term rent/);
});

test('land and commercial listings require structured category facts', () => {
  const land = validateListingJourney({
    transactionType: 'sale',
    structureType: 'land_plot',
    salePrice: '50000000',
    plotSize: '600',
    plotSizeUnit: 'sqm',
    landUse: 'Residential',
    titleStatus: 'unknown'
  });
  assert.equal(land.propertyType, 'land');
  assert.equal(land.plotSize, 600);
  assert.equal(land.titleStatus, 'unknown');

  const commercial = validateListingJourney({
    transactionType: 'rent',
    structureType: 'commercial',
    monthlyPrice: '2000000',
    floorArea: '120',
    commercialUse: 'retail'
  });
  assert.equal(commercial.propertyType, 'commercial');
  assert.equal(commercial.floorArea, 120);
  assert.equal(commercial.commercialUse, 'retail');
  assert.match(validateListingJourney({
    transactionType: 'sale',
    structureType: 'land_plot',
    salePrice: '50000000',
    plotSize: '600',
    plotSizeUnit: 'sqm',
    titleStatus: 'title_deed'
  }).error, /land use/);
});

test('legacy stay and combined-rental submissions remain classifiable', () => {
  assert.equal(validateListingJourney({
    rentalMode: 'short_term',
    structureType: 'apartment',
    nightlyPrice: '80000'
  }).transactionType, 'stay');
  assert.equal(validateListingJourney({
    rentalMode: 'both',
    structureType: 'house',
    nightlyPrice: '80000',
    monthlyPrice: '1000000'
  }).transactionType, 'both');
});

test('public listing coordinates are rounded and invalid coordinates are omitted', () => {
  assert.deepEqual(approximateListingCoordinates(-6.82341, 39.2198), { latitude: -6.82, longitude: 39.22 });
  assert.deepEqual(approximateListingCoordinates(-0.001, 0.001), { latitude: 0, longitude: 0 });
  assert.equal(approximateListingCoordinates(null, 39.2), null);
  assert.equal(approximateListingCoordinates(-91, 39.2), null);
});

test('public listing payloads expose only rounded coordinates and omit coordinate fields when unavailable', () => {
  const listing = withPublicListingCoordinates({
    id: 7,
    latitude: -6.82341,
    longitude: 39.2198,
    approximate_latitude: -6.8143,
    approximate_longitude: 39.2124
  });
  assert.deepEqual(listing, { id: 7, locationLatitude: -6.81, locationLongitude: 39.21 });
  assert.deepEqual(withPublicListingCoordinates({ id: 8, latitude: null, longitude: null }), { id: 8 });
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
