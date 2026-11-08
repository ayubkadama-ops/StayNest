import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRobotsTxt, buildSitemapXml, renderCanonicalPageHtml, renderListingSeoHtml } from '../server/seo.js';

test('sitemap contains absolute public listing URLs and excludes invalid IDs', () => {
  const sitemap = buildSitemapXml('https://makazigo.example/path', [
    { id: 42, updated_at: '2026-11-08T12:30:00Z' },
    { id: 'not-an-id', updated_at: '2026-11-08' },
  ]);
  assert.match(sitemap, /<loc>https:\/\/makazigo\.example\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/makazigo\.example\/listings\.html<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/makazigo\.example\/properties\/42\/<\/loc><lastmod>2026-11-08<\/lastmod>/);
  assert.doesNotMatch(sitemap, /not-an-id|<loc>\//);
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
});
