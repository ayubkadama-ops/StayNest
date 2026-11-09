import { listingCanonicalPath, seoSlug } from '../public-listing-url.js';
export { listingCanonicalPath, seoSlug } from '../public-listing-url.js';

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[character]);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function publicOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Public app URL must use HTTP or HTTPS.');
  return url.origin;
}

export const MIN_LOCATION_LANDING_LISTINGS = 3;

export function buildLocationLandingPages(locations = []) {
  const candidates = locations
    .filter(location => Number(location.listingCount) >= MIN_LOCATION_LANDING_LISTINGS)
    .filter(location => [location.neighborhood, location.city, location.region].some(value => String(value || '').trim()))
    .map(location => ({
      ...location,
      locationLabel: [...new Set([location.neighborhood, location.city, location.region]
        .map(value => String(value || '').trim()).filter(Boolean))].join(', '),
      path: `/locations/${seoSlug([location.neighborhood, location.city, location.region].filter(Boolean).join('-'))}/`
    }))
    .filter(location => location.path !== '/locations//');
  const pathCounts = new Map();
  for (const location of candidates) pathCounts.set(location.path, (pathCounts.get(location.path) || 0) + 1);
  return candidates.filter(location => pathCounts.get(location.path) === 1);
}

export function buildSitemapXml(baseUrl, listings, locations = []) {
  const origin = publicOrigin(baseUrl);
  const paths = ['/', '/listings.html', ...listings
    .filter(listing => Number.isSafeInteger(Number(listing.id)) && Number(listing.id) > 0)
    .map(listingCanonicalPath),
  ...buildLocationLandingPages(locations).map(location => location.path)];
  const listingByPath = new Map(listings
    .filter(listing => Number.isSafeInteger(Number(listing.id)) && Number(listing.id) > 0)
    .map(listing => [listingCanonicalPath(listing), listing]));
  const urls = [...new Set(paths)].map(path => {
    const listing = listingByPath.get(path);
    const lastmod = listing?.updated_at ? new Date(listing.updated_at) : null;
    const lastmodTag = lastmod && Number.isFinite(lastmod.getTime())
      ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`
      : '';
    return `<url><loc>${escapeXml(new URL(path, origin).href)}</loc>${lastmodTag}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}

export function buildRobotsTxt(baseUrl) {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /server/\nDisallow: /database/\nDisallow: /storage/\n\nSitemap: ${new URL('/sitemap.xml', publicOrigin(baseUrl)).href}\n`;
}

export function renderCanonicalPageHtml(html, canonicalUrl) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'Makazi Go';
  const description = html.match(/<meta name="description" content="([^"]*)">/i)?.[1] || '';
  const tags = [
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`
  ].join('');
  const withoutCanonical = html.replace(/<link rel="canonical" href="[^"]*">/i, '');
  const withoutOpenGraph = withoutCanonical.replace(/<meta property="og:(?:type|title|description|url)" content="[^"]*">/gi, '')
    .replace(/<meta name="twitter:(?:card|title|description)" content="[^"]*">/gi, '');
  return withoutOpenGraph.replace('</head>', `${tags}</head>`);
}

export function renderListingSeoHtml(html, listing, canonicalUrl) {
  const title = `${String(listing.title || 'Property details').trim()} | Makazi Go`;
  const locality = [listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', ');
  const descriptionText = String(listing.description || `Explore ${listing.title} in ${locality || 'Tanzania'} on Makazi Go.`)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  const description = descriptionText || 'Explore property details across Tanzania on Makazi Go.';
  const rawImage = String(listing.coverUrl || '');
  const image = /^https?:\/\//i.test(rawImage) || /^\/(?!\/)/.test(rawImage)
    ? new URL(rawImage, publicOrigin(canonicalUrl)).href
    : new URL('/assets/makazi-go-icon.png', publicOrigin(canonicalUrl)).href;
  const salePrice = Number(listing.salePrice);
  const rentalPrice = Number(listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice);
  const offerPrice = Number.isFinite(salePrice) && salePrice > 0 ? salePrice
    : Number.isFinite(rentalPrice) && rentalPrice > 0 ? rentalPrice : null;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: String(listing.title || 'Property listing'),
    description,
    url: canonicalUrl,
    image: [image],
    ...(listing.propertyType ? { category: String(listing.propertyType) } : {}),
    ...(offerPrice ? {
      offers: {
        '@type': 'Offer',
        price: offerPrice,
        priceCurrency: String(listing.currency || 'TZS').toUpperCase(),
        url: canonicalUrl,
        availability: 'https://schema.org/InStock'
      }
    } : {}),
    ...(locality ? {
      address: {
        '@type': 'PostalAddress',
        addressLocality: String(listing.city || listing.neighborhood || ''),
        ...(listing.neighborhood ? { neighborhood: String(listing.neighborhood) } : {}),
        addressRegion: String(listing.region || ''),
        addressCountry: 'TZ'
      }
    } : {})
  };
  const jsonLd = JSON.stringify(structuredData).replace(/[<>&]/g, character => ({
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026'
  })[character]);
  const replacements = [
    [/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`],
    [/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(description)}">`],
    [/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`],
    [/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${escapeHtml(title)}">`],
    [/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${escapeHtml(description)}">`],
    [/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`]
  ];
  let output = html;
  for (const [pattern, replacement] of replacements) output = output.replace(pattern, replacement);
  output = output.replace(/<meta property="og:image" content="[^"]*">/i, `<meta property="og:image" content="${escapeHtml(image)}">`);
  output = output.replace('</head>', `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(image)}"><script type="application/ld+json">${jsonLd}</script></head>`);
  return output;
}

export function renderLocationIndexPage(baseUrl, locations) {
  const origin = publicOrigin(baseUrl);
  const pages = buildLocationLandingPages(locations);
  const canonical = new URL('/locations/', origin).href;
  const title = 'Explore properties by location | Makazi Go';
  const description = 'Browse current homes, stays, land, and commercial properties by area across Tanzania.';
  const links = pages.map(location => `<li><a href="${escapeHtml(location.path)}">${escapeHtml(location.locationLabel)}</a><span>${Number(location.listingCount)} current listings</span></li>`).join('');
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListElement: pages.map((location, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: location.locationLabel,
      url: new URL(location.path, origin).href
    }))
  }).replace(/[<>&]/g, character => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026' })[character]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(new URL('/assets/makazi-go-icon.png', origin).href)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/makazi-go-icon.png"><style>body{margin:0;background:#f5f7f5;color:#173222;font:16px/1.6 system-ui,sans-serif}.wrap{max-width:980px;margin:auto;padding:32px 20px}a{color:#2d5a3d}h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1}.locations{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;padding:0;list-style:none}.locations li{display:flex;flex-direction:column;background:#fff;border:1px solid #dfe7df;border-radius:12px;padding:16px}.locations span{color:#6d7d72;font-size:.9rem}.empty{padding:18px;background:#fff;border-radius:10px}</style><script type="application/ld+json">${structuredData}</script></head><body><main class="wrap"><p><a href="/">Makazi Go</a> / Locations</p><h1>Explore properties by location</h1><p>${escapeHtml(description)}</p>${pages.length ? `<ul class="locations">${links}</ul>` : '<p class="empty">Location guides will appear as more reviewed listings become available in each area.</p>'}<p><a href="/listings.html">Browse all current listings</a></p></main></body></html>`;
}

export function renderLocationLandingPage(baseUrl, location, listings) {
  const origin = publicOrigin(baseUrl);
  const page = buildLocationLandingPages([{ ...location, listingCount: listings.length }])[0];
  if (!page || listings.length < MIN_LOCATION_LANDING_LISTINGS) return null;
  const canonical = new URL(page.path, origin).href;
  const title = `Properties in ${page.locationLabel} | Makazi Go`;
  const description = `Explore ${listings.length} current property listings in ${page.locationLabel}, Tanzania. Compare details and contact the responsible property professional.`;
  const cards = listings.map(listing => {
    const href = listingCanonicalPath(listing);
    const image = /^https?:\/\//i.test(String(listing.coverUrl || '')) || /^\/(?!\/)/.test(String(listing.coverUrl || ''))
      ? new URL(listing.coverUrl, origin).href
      : new URL('/assets/makazi-go-icon.png', origin).href;
    const price = Number(listing.salePrice) > 0
      ? `${listing.currency || 'TZS'} ${Number(listing.salePrice).toLocaleString()} · For sale`
      : Number(listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice) > 0
        ? `${listing.currency || 'TZS'} ${Number(listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice).toLocaleString()}${listing.nightlyPrice ? ' / night' : listing.monthlyPrice ? ' / month' : ' / year'}`
        : 'Contact property professional';
    return `<article><a href="${escapeHtml(href)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Property')} in ${escapeHtml(page.locationLabel)}" loading="lazy"><h2>${escapeHtml(listing.title || 'Property listing')}</h2></a><p>${escapeHtml([listing.propertyType, listing.transactionType].filter(Boolean).join(' · '))}</p><p>${escapeHtml(price)}</p><a href="${escapeHtml(href)}">View property details</a></article>`;
  }).join('');
  const items = listings.map((listing, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: String(listing.title || 'Property listing'),
    url: new URL(listingCanonicalPath(listing), origin).href
  }));
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical,
    mainEntity: { '@type': 'ItemList', itemListElement: items }
  }).replace(/[<>&]/g, character => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026' })[character]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(new URL('/assets/makazi-go-icon.png', origin).href)}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${jsonLd}</script><style>body{margin:0;background:#f5f7f5;color:#173222;font:16px/1.6 system-ui,sans-serif}.wrap{max-width:1180px;margin:auto;padding:28px 20px}a{color:#2d5a3d}.breadcrumb{font-size:.9rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}.grid article{overflow:hidden;background:#fff;border:1px solid #dfe7df;border-radius:12px;padding:14px}.grid img{width:100%;height:190px;object-fit:cover;border-radius:8px}.grid h2{font-size:1.2rem}.muted{color:#6d7d72}</style></head><body><main class="wrap"><p class="breadcrumb"><a href="/">Makazi Go</a> / <a href="/locations/">Locations</a> / ${escapeHtml(page.locationLabel)}</p><h1>Properties in ${escapeHtml(page.locationLabel)}</h1><p>${escapeHtml(description)}</p><section class="grid" aria-label="Available properties">${cards}</section><p class="muted">Listings and availability may change. Contact the responsible professional to confirm details.</p><p><a href="/listings.html">Browse all properties</a></p></main></body></html>`;
}
