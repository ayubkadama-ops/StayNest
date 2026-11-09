import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { installImageFallbacks } from './image-fallback.js';
import { bedroomSummary } from './listing-presentation.js';
import { listingCanonicalPath } from './public-listing-url.js';

installImageFallbacks();

const page = document.querySelector('#listingDetailPage');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const mediaUrl = value => { const source = /^(https?:\/\/|\/)/i.test(String(value || '')) ? String(value) : '/assets/ezgif-frame-018.jpg'; return window.cloudinaryAssetUrl?.(source) || source; };
const avatarUrl = value => String(value || '').trim() ? mediaUrl(value) : '/assets/default-avatar.svg';
const money = listing => {
  if (listing.salePrice) return `${listing.currency || 'TZS'} ${Number(listing.salePrice).toLocaleString()} · For sale`;
  const value = listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice || 0;
  const period = listing.nightlyPrice ? 'night' : listing.monthlyPrice ? 'month' : 'year';
  return `${listing.currency || 'TZS'} ${Number(value).toLocaleString()} / ${period}`;
};
const categoryDetailLabels = {
  homeStyle: 'Home style',
  outdoorSpace: 'Outdoor space',
  parking: 'Parking',
  apartmentStyle: 'Apartment style',
  floorLevel: 'Floor level',
  buildingAccess: 'Building access',
  balcony: 'Private balcony',
  roomFurnishing: 'Furnishing',
  sharedSpaces: 'Shared spaces',
  roomAccess: 'Room access',
  guestRooms: 'Guest rooms',
  mealService: 'Meal service',
  receptionHours: 'Reception',
  housekeeping: 'Housekeeping',
  utilitiesIncluded: 'Utilities',
  kitchenSetup: 'Kitchen',
  hotelRooms: 'Guest rooms',
  customerAccess: 'Customer access',
  loadingAccess: 'Loading access',
};
function categoryDetailsMarkup(value) {
  let details = value;
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch { return ''; }
  }
  if (!details || typeof details !== 'object' || Array.isArray(details)) return '';
  const rows = Object.entries(details)
    .filter(([key, detail]) => categoryDetailLabels[key] && detail !== null && detail !== '')
    .map(([key, detail]) => `<span><strong>${categoryDetailLabels[key]}:</strong> ${escapeHtml(String(detail).replaceAll('_', ' '))}</span>`)
    .join('');
  return rows ? `<div class="listing-page-facts listing-category-details">${rows}</div>` : '';
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('Makazi Go returned an invalid response.'); }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
async function csrf() { return (await api('/api/auth/csrf')).token; }
function toast(message) {
  const node = document.querySelector('#listingToast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.hidden = true; }, 3600);
}
function mediaMarkup(media, title) {
  return media.map((item, index) => item.mediaType === 'video'
    ? `<video class="listing-page-media ${index === 0 ? 'listing-page-cover-media' : ''}" src="${escapeHtml(mediaUrl(item.mediaUrl))}" controls playsinline preload="metadata"></video>`
    : `<img class="listing-page-media ${index === 0 ? 'listing-page-cover-media' : ''}" src="${escapeHtml(mediaUrl(item.mediaUrl))}" data-image-fallback="/assets/ezgif-frame-018.jpg" alt="${escapeHtml(item.caption || title)}" loading="lazy">`).join('');
}
function readComparedListings() {
  try {
    const items = JSON.parse(localStorage.getItem('staynest.compareListings') || '[]');
    return Array.isArray(items) ? items.filter(item => item && item.id).slice(-3) : [];
  } catch { return []; }
}
function comparisonMarkup(items) {
  const columns = items.map(item => `<th scope="col"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.city || '')}</small><button type="button" class="listing-compare-remove" data-remove-compare="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)} from comparison">Remove</button></th>`).join('');
  const fields = [
    ['Type', item => item.propertyType || 'Property'],
    ['Price', item => item.price || 'Contact agent'],
    ['Bedrooms', item => item.bedrooms ?? '—'],
    ['Bathrooms', item => item.bathrooms ?? '—'],
    ['Guests', item => item.maxGuests ?? '—'],
    ['Stay', item => item.rentalMode || 'Flexible'],
    ['Rating', item => item.rating ? `${Number(item.rating).toFixed(1)} / 5 (${item.reviewCount || 0})` : 'No reviews'],
  ];
  const rows = fields.map(([label, value]) => `<tr><th scope="row">${label}</th>${items.map(item => `<td>${escapeHtml(value(item))}</td>`).join('')}</tr>`).join('');
  return items.length < 2
    ? `<p class="listing-compare-empty">Select one more property to compare features side by side. You can compare up to three homes.</p>`
    : `<div class="listing-compare-table-wrap"><table class="listing-compare-table"><thead><tr><th scope="col">Feature</th>${columns}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function showListingComparison(items) {
  let dialog = document.querySelector('#listingComparisonDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'listingComparisonDialog';
    dialog.className = 'listing-comparison-dialog';
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    document.body.append(dialog);
  }
  dialog.innerHTML = `<div class="listing-comparison-head"><div><p class="eyebrow">Makazi Go comparison</p><h2>Compare properties</h2></div><button type="button" class="outline-btn" data-close-compare>Close</button></div>${comparisonMarkup(items)}`;
  dialog.querySelector('[data-close-compare]').onclick = () => dialog.close();
  dialog.querySelectorAll('[data-remove-compare]').forEach(button => button.onclick = () => {
    const remaining = readComparedListings().filter(item => String(item.id) !== button.dataset.removeCompare);
    localStorage.setItem('staynest.compareListings', JSON.stringify(remaining));
    showListingComparison(remaining);
  });
  if (!dialog.open) dialog.showModal();
}
export function addToComparison(listing) {
  const items = readComparedListings();
  const existing = items.findIndex(item => String(item.id) === String(listing.id));
  if (existing >= 0) {
    items.splice(existing, 1);
    localStorage.setItem('staynest.compareListings', JSON.stringify(items));
    showListingComparison(items);
    toast('Property removed from comparison');
    return false;
  }
  if (items.length >= 3) {
    toast('Compare up to three properties at a time');
    return false;
  }
  items.push({
    id: listing.id,
    title: listing.title,
    city: listing.city,
    propertyType: listing.propertyType,
    price: money(listing),
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    maxGuests: listing.maxGuests,
    rentalMode: listing.rentalMode,
    rating: listing.rating,
    reviewCount: listing.reviewCount,
  });
  localStorage.setItem('staynest.compareListings', JSON.stringify(items));
  showListingComparison(items);
  toast(items.length > 1 ? 'Property added to comparison' : 'Added. Select another property to compare.');
  return true;
}
export function markup(result) {
  const listing = result.listing;
  const media = Array.isArray(result.media) && result.media.length ? result.media : [{ mediaUrl: listing.coverUrl, mediaType: 'image' }];
  const amenities = String(listing.amenities || '').split(',').filter(Boolean);
  const reviews = Array.isArray(result.reviews) ? result.reviews : [];
  const reviewCount = Number(listing.reviewCount ?? reviews.length);
  const reviewsMarkup = reviews.length
    ? reviews.map(review => `<article class="listing-review"><div><strong>${escapeHtml(`${review.firstName || ''} ${review.lastName || ''}`.trim() || 'Makazi Go guest')}</strong><span>${Number(review.rating)} / 5</span></div><small>${review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Verified stay'}</small><p>${escapeHtml(review.comment || 'Guest left a rating.')}</p>${review.hostReply ? `<div class="listing-review-reply"><strong>Owner/agent response</strong><p>${escapeHtml(review.hostReply)}</p></div>` : listing.canRespondToReviews ? `<form class="listing-review-reply-form" data-review-reply="${escapeHtml(review.id)}"><label>Respond to this review<textarea name="reply" maxlength="2000" rows="3" required></textarea></label><button class="outline-btn" type="submit">Post response</button></form>` : ''}</article>`).join('')
    : '<p class="listing-page-description">No guest reviews yet.</p>';
  const reviewBookings = Array.isArray(result.reviewBookings) ? result.reviewBookings : [];
  const reviewFormMarkup = reviewBookings.length
    ? `<form class="listing-review-form" id="listingReviewForm"><h3>Share your experience</h3><label>Completed stay<select name="bookingId" required>${reviewBookings.map(booking => `<option value="${escapeHtml(booking.id)}">Completed stay${booking.createdAt ? ` · ${escapeHtml(new Date(booking.createdAt).toLocaleDateString())}` : ''}</option>`).join('')}</select></label><label>Your rating<select name="rating" required><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label><label>Your review<textarea name="comment" maxlength="5000" rows="4" placeholder="What should future guests know?"></textarea></label><button class="primary" type="submit">Post review</button></form>`
    : '';
  const agentName = `${listing.firstName || ''} ${listing.lastName || ''}`.trim() || listing.agencyName || 'Makazi Go agent';
  const enquiryOnly = !['stay', 'both'].includes(listing.transactionType);
  const propertyFacts = enquiryOnly ? '<span>Contact agent for terms</span>' : `<span>${escapeHtml(bedroomSummary(listing))}</span><span>${listing.bathrooms || 0} bathrooms</span><span>Up to ${listing.maxGuests || 0} guests</span><span>${escapeHtml(listing.rentalMode || 'Flexible stay')}</span>`;
  const categoryFacts = listing.propertyType === 'land'
    ? `<span>${listing.plotSize ? `${escapeHtml(listing.plotSize)} ${escapeHtml(listing.plotSizeUnit || '')}` : 'Plot size not provided'}</span><span>${escapeHtml(listing.landUse || 'Land use not provided')}</span><span>Advertiser reports ${escapeHtml((listing.titleStatus || 'unknown').replaceAll('_', ' '))} title status</span>`
    : listing.propertyType === 'commercial'
      ? `<span>${listing.floorArea ? `${escapeHtml(listing.floorArea)} m²` : 'Floor area not provided'}</span><span>${escapeHtml((listing.commercialUse || 'Use not provided').replaceAll('_', ' '))}</span>`
      : '';
  const extraCategoryFacts = categoryDetailsMarkup(listing.categoryDetails);
  const verification = listing.propertyVerification || {};
  const verificationChecks = [
    ['Identity', verification.identity],
    ['Location', verification.location],
    ['Owner/agent authorization', verification.ownerOrAgentAuthorization],
    ['Property documents', verification.documents]
  ];
  const verificationMarkup = `<section class="listing-property-verification"><h2>Makazi Go property checks</h2><p><strong>${escapeHtml((verification.status || 'unverified').replaceAll('_', ' '))}</strong>${verification.verifiedAt ? ` · checked ${escapeHtml(new Date(verification.verifiedAt).toLocaleDateString())}` : ''}</p><ul>${verificationChecks.map(([label, status]) => `<li><span>${label}</span><strong>${escapeHtml(String(status || 'not reviewed').replaceAll('_', ' '))}</strong></li>`).join('')}</ul><small>These checks are a platform review, not a legal title guarantee. Title details, if shown, are advertiser-reported.</small></section>`;
  return `<button class="listing-back-button" type="button" id="backToListings">← All listings</button>
    <div class="listing-page-gallery">${mediaMarkup(media, listing.title)}</div>
    <div class="listing-page-layout">
      <article class="listing-page-main"><p class="eyebrow">${escapeHtml(listing.propertyType || 'property')} · ${listing.verifiedAgent ? 'Identity-checked agent' : 'Makazi Go agent'}</p><h1>${escapeHtml(listing.title)}</h1><p class="listing-page-location">${escapeHtml([listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', '))}</p><div class="listing-page-facts">${propertyFacts}${categoryFacts}</div>${extraCategoryFacts}<p class="listing-page-description">${escapeHtml(listing.description || 'A carefully presented property in Tanzania.')}</p>${verificationMarkup}${amenities.length ? `<h2>Amenities</h2><div class="listing-page-amenities">${amenities.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}<h2>Guest reviews <span class="listing-review-count">${reviewCount}</span></h2><div class="listing-reviews">${reviewsMarkup}</div>${reviewFormMarkup}<h2>Location</h2>${Number.isFinite(Number(listing.locationLatitude)) && Number.isFinite(Number(listing.locationLongitude)) ? `<div id="listingLocationMap" class="listing-page-map" role="application" aria-label="Approximate map location for ${escapeHtml(listing.title)}"></div><p class="listing-page-description">Approximate area shown to protect the exact address, which remains private until booking.</p>` : `<p class="listing-page-description">${escapeHtml([listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', ') || 'Location details are available from the responsible agent.')}. The exact address remains private until booking.</p>`}</article>
      <aside class="listing-page-aside"><div class="listing-page-price"><strong>${escapeHtml(money(listing))}</strong><span>${listing.rating ? `★ ${Number(listing.rating).toFixed(1)} (${listing.reviewCount || 0} reviews)` : 'New listing'}</span></div><div class="listing-page-agent"><img data-profile-avatar class="listing-page-agent-avatar" src="${escapeHtml(avatarUrl(listing.profileImageUrl))}" alt="${escapeHtml(agentName)}"><div><strong>${escapeHtml(agentName)} ${listing.verifiedAgent ? '✓' : ''}</strong><small>${escapeHtml(listing.agencyName || 'Responsible Makazi Go agent')}</small></div><button type="button" class="outline-btn" id="viewAgent" data-agent-id="${escapeHtml(listing.agentId || '')}">View agent</button></div><button type="button" class="primary listing-page-book" id="requestBooking">${enquiryOnly ? 'Enquire about property' : 'Request to book'} <span>→</span></button><div class="listing-page-actions"><button type="button" class="outline-btn" id="saveListing">${listing.saved ? 'Saved' : 'Save'}</button><button type="button" class="outline-btn" id="shareListing">Share</button><button type="button" class="outline-btn" id="compareListing" aria-pressed="${readComparedListings().some(item => String(item.id) === String(listing.id))}">Compare</button><button type="button" class="outline-btn" id="messageAgent">Message agent</button><button type="button" class="outline-btn" id="reportListing">Report listing</button></div></aside>
    </div>`;
}
export function wire(listing, { onBack } = {}) {
  const agentAvatar = document.querySelector('.listing-page-agent-avatar');
  agentAvatar?.addEventListener('error', () => {
    if (agentAvatar.dataset.avatarFallback || new URL(agentAvatar.src, location.href).pathname === '/assets/default-avatar.svg') {
      const fallback = document.createElement('span');
      fallback.className = `${agentAvatar.className} makazi-avatar-fallback`;
      fallback.textContent = 'MG';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', agentAvatar.alt || 'Profile image unavailable');
      const style = getComputedStyle(agentAvatar);
      for (const property of ['width', 'height', 'minWidth', 'minHeight', 'borderRadius', 'flex', 'margin']) fallback.style[property] = style[property];
      agentAvatar.replaceWith(fallback);
      return;
    }
    agentAvatar.dataset.avatarFallback = 'true';
    agentAvatar.src = '/assets/default-avatar.svg';
  });
  const locationMap = document.querySelector('#listingLocationMap');
  const locationLatitude = Number(listing.locationLatitude), locationLongitude = Number(listing.locationLongitude);
  if (locationMap && Number.isFinite(locationLatitude) && Number.isFinite(locationLongitude)) {
    const map = L.map(locationMap, { scrollWheelZoom: false }).setView([locationLatitude, locationLongitude], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    L.circleMarker([locationLatitude, locationLongitude], {
      radius: 9,
      color: '#145c42',
      fillColor: '#23825e',
      fillOpacity: 0.8,
      weight: 2,
    }).addTo(map);
    setTimeout(() => map.invalidateSize(), 0);
  }
  const returnParameter = new URLSearchParams(location.search).get('returnTo') || '/listings.html';
  let returnTo = '/listings.html';
  try {
    const target = new URL(returnParameter, location.origin);
    if (target.origin === location.origin && target.pathname === '/listings.html') returnTo = `${target.pathname}${target.search}`;
  } catch {}
  document.querySelector('#backToListings').onclick = onBack || (() => { location.href = returnTo; });
  document.querySelector('#viewAgent').onclick = () => { if (listing.agentId) location.href = `/index.html?view=agent&agent=${encodeURIComponent(listing.agentId)}`; };
  document.querySelector('#requestBooking').onclick = () => {
    location.href = ['stay', 'both'].includes(listing.transactionType)
      ? `/index.html?listing=${encodeURIComponent(listing.id)}&book=1`
      : `/index.html?messageAgent=${encodeURIComponent(listing.agentId || '')}`;
  };
  document.querySelector('#shareListing').onclick = async () => {
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); toast('Listing link copied'); }
    } catch (error) { if (error.name !== 'AbortError') toast('Unable to share this listing'); }
  };
  document.querySelector('#compareListing').onclick = () => {
    const compared = addToComparison(listing);
    document.querySelector('#compareListing').setAttribute('aria-pressed', String(compared));
  };
  document.querySelector('#saveListing').onclick = async event => {
    try {
      const saved = event.currentTarget.textContent.trim() === 'Saved';
      await api(`/api/listings/${listing.id}/save`, { method: saved ? 'DELETE' : 'POST', headers: { 'X-CSRF-Token': await csrf() } });
      event.currentTarget.textContent = saved ? 'Save' : 'Saved';
      toast(saved ? 'Removed from saved homes' : 'Saved to your homes');
    } catch (error) { toast(error.message); }
  };
  document.querySelector('#messageAgent').onclick = () => { if (listing.agentId) location.href = `/index.html?messageAgent=${encodeURIComponent(listing.agentId)}`; };
  document.querySelector('#reportListing').onclick = async () => {
    const reason = window.prompt('Tell Makazi Go why you are reporting this listing:');
    if (!reason) return;
    try {
      await api('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: JSON.stringify({ entityType: 'listing', entityId: listing.id, reason: 'other', details: reason }) });
      toast('Report sent to Makazi Go administrators');
    } catch (error) { toast(error.message); }
  };
  document.querySelector('#listingReviewForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api(`/api/listings/${encodeURIComponent(listing.id)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
        body: JSON.stringify({
          bookingId: form.elements.bookingId.value,
          rating: Number(form.elements.rating.value),
          comment: form.elements.comment.value,
        }),
      });
      toast('Your review has been posted');
      location.reload();
    } catch (error) {
      submit.disabled = false;
      toast(error.message);
    }
  });
  document.querySelectorAll('[data-review-reply]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api(`/api/listings/${encodeURIComponent(listing.id)}/reviews/${encodeURIComponent(form.dataset.reviewReply)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
        body: JSON.stringify({ reply: form.elements.reply.value }),
      });
      toast('Your response has been published');
      location.reload();
    } catch (error) {
      submit.disabled = false;
      toast(error.message);
    }
  }));
}
const menu = document.querySelector('.menu');
menu?.addEventListener('click', () => {
  const open = document.body.classList.toggle('mobile-nav-open');
  menu.setAttribute('aria-expanded', String(open));
});
if (page) {
  const id = location.pathname.match(/^\/properties\/(?:[a-z0-9-]+-)?([1-9]\d*)\/?$/)?.[1]
    || new URLSearchParams(location.search).get('listing');
  if (!id) location.replace('/listings.html');
  else api(`/api/listings/${encodeURIComponent(id)}/details`).then(result => {
    page.innerHTML = markup(result);
    document.title = `${result.listing.title} | Makazi Go`;
    const canonical = new URL(listingCanonicalPath(result.listing), location.origin).href;
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) canonicalLink.href = canonical;
    const description = String(result.listing.description || `Explore ${result.listing.title} on Makazi Go.`).replace(/\s+/g, ' ').slice(0, 160);
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) descriptionTag.content = description;
    for (const [property, value] of [['og:title', document.title], ['og:description', description], ['og:url', canonical]]) {
      const tag = document.querySelector(`meta[property="${property}"]`);
      if (tag) tag.content = value;
    }
    wire(result.listing);
  }).catch(error => { page.innerHTML = `<p class="feed-empty">${escapeHtml(error.message)}</p><a class="primary" href="/listings.html">Back to listings</a>`; });
}
