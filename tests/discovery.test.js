import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDiscoveryPaginationSql, createDiscoveryPlan } from '../server/discovery.js';

test('discovery builds combined geographic, journey, room, size, and furnishing filters', () => {
  const plan = createDiscoveryPlan({
    q: 'Mikocheni apartment',
    location: 'Dar es Salaam',
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    ward: 'Mikocheni',
    propertyType: 'apartment',
    transactionType: 'rent',
    minBedrooms: '3',
    minBathrooms: '2',
    minSize: '90',
    furnished: 'furnished',
    page: '2',
    limit: '100'
  });

  assert.equal(plan.error, undefined);
  assert.equal(plan.filters.limit, 60);
  assert.equal(plan.offset, 60);
  assert.match(plan.whereSql, /l\.district LIKE \?/);
  assert.match(plan.whereSql, /l\.ward LIKE \?/);
  assert.match(plan.whereSql, /l\.city LIKE \? OR l\.neighborhood LIKE \?/);
  assert.match(plan.whereSql, /l\.transaction_type=\? OR l\.transaction_type="both"/);
  assert.match(plan.whereSql, /l\.bedrooms>=\?/);
  assert.match(plan.whereSql, /l\.bathrooms>=\?/);
  assert.match(plan.whereSql, /ELSE l\.property_size\s+END>=\?/);
  assert.match(plan.whereSql, /l\.furnished=\?/);
  assert.ok(plan.params.includes('%Kinondoni%'));
  assert.ok(plan.params.includes('%Mikocheni%'));
  assert.ok(plan.params.includes('%Dar es Salaam%'));
  assert.ok(plan.params.includes('furnished'));
});

test('price filters use matching price periods and currencies, defaulting to TZS', () => {
  const sale = createDiscoveryPlan({
    transactionType: 'sale',
    minPrice: '50000000',
    maxPrice: '90000000'
  });
  assert.equal(sale.filters.pricePeriod, 'sale');
  assert.equal(sale.filters.currency, 'TZS');
  assert.match(sale.whereSql, /l\.sale_price IS NOT NULL AND l\.currency=\?/);
  assert.ok(sale.params.includes('TZS'));
  assert.ok(!sale.whereSql.includes('COALESCE'));

  const yearlyRent = createDiscoveryPlan({
    transactionType: 'rent',
    pricePeriod: 'yearly',
    currency: 'USD',
    minPrice: '12000'
  });
  assert.match(yearlyRent.whereSql, /l\.yearly_price>=\?/);
  assert.ok(yearlyRent.params.includes('USD'));
  assert.ok(!yearlyRent.params.includes('TZS'));
});

test('discovery rejects invalid ranges, units, and incomplete availability dates', () => {
  assert.match(createDiscoveryPlan({ minPrice: '20', maxPrice: '10', pricePeriod: 'monthly' }).error, /Minimum price/);
  assert.match(createDiscoveryPlan({ transactionType: 'stay', pricePeriod: 'monthly' }).error, /nightly/);
  assert.match(createDiscoveryPlan({ minPrice: '20' }).error, /Choose whether the price/);
  assert.match(createDiscoveryPlan({ availableFrom: '2026-12-01' }).error, /both availability dates/);
  assert.match(createDiscoveryPlan({ availableFrom: '2026-02-30', availableTo: '2026-03-02' }).error, /valid availability/);
  assert.match(createDiscoveryPlan({ minBedrooms: '2.5' }).error, /non-negative/);
});

test('amenity, availability, and verification filters stay parameterized and conjunctive', () => {
  const plan = createDiscoveryPlan({
    amenities: ['Wi-Fi', 'Parking', 'Wi-Fi'],
    availableFrom: '2026-12-10',
    availableTo: '2026-12-14',
    verificationStatus: 'verified'
  });

  assert.equal(plan.error, undefined);
  assert.match(plan.whereSql, /COUNT\(DISTINCT la\.id\)/);
  assert.match(plan.whereSql, /b\.check_in<\? AND b\.check_out>\?/);
  assert.match(plan.whereSql, /av\.status="blocked"/);
  assert.match(plan.whereSql, /av\.status="available"/);
  assert.match(plan.whereSql, /EXISTS \(\s*SELECT 1 FROM identity_verifications/);
  assert.ok(plan.params.includes('Wi-Fi'));
  assert.ok(plan.params.includes('Parking'));
  assert.deepEqual(plan.orderParams, []);
});

test('pagination, relevance, and sorting are bounded and deterministic', () => {
  const plan = createDiscoveryPlan({
    q: 'house in Mwanza',
    sort: 'relevance',
    page: '999999',
    limit: '1000'
  });

  assert.equal(plan.filters.page, 10000);
  assert.equal(plan.filters.limit, 60);
  assert.equal(plan.offset, 599940);
  assert.match(plan.whereSql, /l\.title LIKE \?.*l\.description LIKE \?.*l\.neighborhood LIKE \?/s);
  assert.doesNotMatch(plan.whereSql, /MATCH\(|AGAINST/);
  assert.match(plan.orderBy, /CASE WHEN l\.title LIKE \? THEN 0 WHEN l\.neighborhood LIKE \? OR l\.city LIKE \? THEN 1/);
  assert.deepEqual(plan.orderParams, ['%house in Mwanza%', '%house in Mwanza%', '%house in Mwanza%']);
  assert.equal(plan.params.filter(value => value === '%house in Mwanza%').length, 9);
  assert.match(createDiscoveryPlan({ sort: 'price_low', pricePeriod: 'monthly' }).orderBy, /l\.monthly_price ASC, l\.id DESC/);
  assert.match(createDiscoveryPlan({ sort: 'price_high', pricePeriod: 'sale' }).orderBy, /l\.sale_price DESC, l\.id DESC/);
  assert.match(createDiscoveryPlan({ sort: 'unknown' }).error, /sort order/);
});

test('pagination SQL uses bounded integer literals for TiDB LIMIT syntax', () => {
  assert.equal(buildDiscoveryPaginationSql(60, 10000), 'LIMIT 60 OFFSET 599940');
  assert.equal(buildDiscoveryPaginationSql(24, 2), 'LIMIT 24 OFFSET 24');
  assert.throws(() => buildDiscoveryPaginationSql('24', 2), /bounded integers/);
  assert.throws(() => buildDiscoveryPaginationSql(61, 1), /bounded integers/);
  assert.throws(() => buildDiscoveryPaginationSql(24, 10001), /bounded integers/);
});
