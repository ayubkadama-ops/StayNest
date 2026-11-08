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

export function buildSitemapXml(baseUrl, listings) {
  const origin = publicOrigin(baseUrl);
  const listingById = new Map(
    listings.filter(listing => Number.isSafeInteger(Number(listing.id)) && Number(listing.id) > 0)
      .map(listing => [Number(listing.id), listing])
  );
  const paths = ['/', '/listings.html', ...listings
    .map(listing => Number(listing.id))
    .filter(id => Number.isSafeInteger(id) && id > 0)
    .map(id => `/properties/${id}/`)];
  const urls = [...new Set(paths)].map(path => {
    const lastSegment = path.match(/^\/properties\/(\d+)\/$/);
    const listing = lastSegment && listingById.get(Number(lastSegment[1]));
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
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`
  ].join('');
  const withoutCanonical = html.replace(/<link rel="canonical" href="[^"]*">/i, '');
  return withoutCanonical.replace('</head>', `${tags}</head>`);
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
    : undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: String(listing.title || 'Property listing'),
    description,
    url: canonicalUrl,
    ...(image ? { image: [image] } : {}),
    ...(locality ? {
      address: {
        '@type': 'PostalAddress',
        addressLocality: String(listing.neighborhood || listing.city || ''),
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
  if (image) output = output.replace(/<meta property="og:image" content="[^"]*">/i, `<meta property="og:image" content="${escapeHtml(image)}">`);
  return output.replace('</head>', `<script type="application/ld+json">${jsonLd}</script></head>`);
}
