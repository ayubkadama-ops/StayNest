import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLocationLandingPages,
  buildRobotsTxt,
  buildSitemapXml,
  listingCanonicalPath,
  renderCanonicalPageHtml,
  renderListingSeoHtml,
  renderLocationIndexPage,
  renderLocationLandingPage
} from '../server/seo.js';

test('sitemap contains absolute public listing URLs and excludes invalid IDs', () => {
  const sitemap = buildSitemapXml('https://makazigo.example/path', [
    { id: 42, title: 'Dar es Salaam Villa', updated_at: '2026-11-08T12:30:00Z' },
    { id: 'not-an-id', updated_at: '2026-11-08' },
  ], [
    { neighborhood: 'Masaki', city: 'Dar es Salaam', region: 'Dar', listingCount: 3 },
    { neighborhood: 'Kijiji', city: 'Dodoma', region: 'Dodoma', listingCount: 2 },
  ]);
  assert.match(sitemap, /<loc>https:\/\/makazigo\.example\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/makazigo\.example\/listings\.html<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/makazigo\.example\/properties\/dar-es-salaam-villa-42\/<\/loc><lastmod>2026-11-08<\/lastmod>/);
  assert.match(sitemap, /<loc>https:\/\/makazigo\.example\/locations\/masaki-dar-es-salaam-dar\/<\/loc>/);
  assert.doesNotMatch(sitemap, /locations\/kijiji-dodoma-dodoma/);
  assert.doesNotMatch(sitemap, /not-an-id|<loc>\//);
});

test('listing canonical paths are readable, stable, and require a valid ID', () => {
  assert.equal(listingCanonicalPath({ id: 42, title: 'Mlimani Heights, Dar es Salaam' }), '/properties/mlimani-heights-dar-es-salaam-42/');
  assert.equal(listingCanonicalPath({ id: 43, title: '東京' }), '/properties/property-43/');
  assert.throws(() => listingCanonicalPath({ id: 0, title: 'Invalid' }), /valid listing ID/);
});

test('location pages omit thin and ambiguous location groups', () => {
  const locations = buildLocationLandingPages([
    { neighborhood: 'Masaki', city: 'Dar es Salaam', region: 'Dar', listingCount: 3 },
    { neighborhood: 'Masaki', city: 'Dar es Salaam', region: 'Dar', listingCount: 9 },
    { neighborhood: 'Kijiji', city: 'Dodoma', region: 'Dodoma', listingCount: 2 },
  ]);
  assert.equal(locations.length, 0);
  assert.equal(buildLocationLandingPages([
    { neighborhood: 'Masaki', city: 'Dar es Salaam', region: 'Dar', listingCount: 3 },
  ])[0].path, '/locations/masaki-dar-es-salaam-dar/');
});

test('robots sitemap URL is absolute and uses configured origin', () => {
  assert.match(buildRobotsTxt('https://makazigo.example'), /Sitemap: https:\/\/makazigo\.example\/sitemap\.xml/);
  assert.throws(() => buildRobotsTxt('javascript:alert(1)'), /HTTP or HTTPS/);
});

test('static public pages receive absolute canonical and Open Graph URLs', () => {
  const html = '<html><head><title>Makazi Go</title><meta name="description" content="Find property."></head></html>';
  const rendered = renderCanonicalPageHtml(html, 'https://makazigo.example/listings.html');
  assert.match(rendered, /rel="canonical" href="https:\/\/makazigo\.example\/listings\.html"/);
  assert.match(rendered, /property="og:url" content="https:\/\/makazigo\.example\/listings\.html"/);
  assert.match(rendered, /property="og:title" content="Makazi Go"/);
  assert.match(rendered, /name="twitter:card" content="summary_large_image"/);
  assert.equal((rendered.match(/property="og:title"/g) || []).length, 1);
});

test('listing SEO metadata is escaped, canonical, and includes safe structured data', () => {
  const html = `<html><head><title>Property details | Makazi Go</title>
    <meta name="description" content="Verified property details and enquiries on Makazi Go.">
    <meta property="og:title" content="Property details | Makazi Go">
    <meta property="og:description" content="Verified property details and enquiries on Makazi Go.">
    <meta property="og:url" content="/listing-detail.html">
    <meta property="og:image" content="/assets/makazi-go-icon.png">
    <link rel="canonical" href="/listings.html"></head><body></body></html>`;
  const rendered = renderListingSeoHtml(html, {
    title: '<Villa "A">',
    description: `A quiet area </script><script>alert('x')</script>`,
    city: 'Dar es Salaam',
    coverUrl: '/media/cover.webp'
  }, 'https://makazigo.example/properties/42/');
  assert.match(rendered, /<title>&lt;Villa &quot;A&quot;&gt; \| Makazi Go<\/title>/);
  assert.match(rendered, /href="https:\/\/makazigo\.example\/properties\/42\/"/);
  assert.match(rendered, /og:image" content="https:\/\/makazigo\.example\/media\/cover\.webp"/);
  assert.doesNotMatch(rendered, /<\/script><script>alert/);
  assert.match(rendered, /"@type":"RealEstateListing"/);
  assert.match(rendered, /twitter:image/);
});

test('location pages are useful, escaped, canonical, and contain linked listings', () => {
  const locations = [{ neighborhood: '<Masaki>', city: 'Dar es Salaam', region: 'Dar', listingCount: 3 }];
  const index = renderLocationIndexPage('https://makazigo.example', locations);
  assert.match(index, /href="\/locations\/masaki-dar-es-salaam-dar\/"/);
  assert.doesNotMatch(index, /<Masaki>/);
  const page = renderLocationLandingPage('https://makazigo.example', locations[0], [
    { id: 1, title: 'Villa One', salePrice: 125000000, currency: 'TZS', coverUrl: '/media/one.jpg' },
    { id: 2, title: 'Villa Two', nightlyPrice: 50000, currency: 'TZS' },
    { id: 3, title: 'Villa Three', monthlyPrice: 900000, currency: 'TZS' },
  ]);
  assert.match(page, /rel="canonical" href="https:\/\/makazigo\.example\/locations\/masaki-dar-es-salaam-dar\/"/);
  assert.match(page, /properties\/villa-one-1/);
  assert.match(page, /"@type":"CollectionPage"/);
  assert.equal(renderLocationLandingPage('https://makazigo.example', locations[0], [
    { id: 1, title: 'One' }, { id: 2, title: 'Two' }
  ]), null);
});
