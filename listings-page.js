import { installLiveFormValidation } from './form-validation.js';
import { markup as sharedDetailMarkup, wire as wireListingDetail } from './listing-detail-page.js';

installLiveFormValidation();

const grid = document.querySelector('#allListingsGrid');
const detail = document.querySelector('#listingDetailPage');
const filters = document.querySelector('#listingFilters');
const resultNote = document.querySelector('#listingsResultNote');
const inlineDetail = document.querySelector('#listingInlineDetail');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const imageUrl = value => { const source = /^(https?:\/\/|\/)/i.test(String(value || '')) ? String(value) : '/assets/ezgif-frame-018.jpg'; return window.cloudinaryAssetUrl?.(source) || source; };
const categoryCopy = {
  house: ['Homes', 'Homes for every stage of life', 'Browse published houses from Makazi Go agents.'],
  apartment: ['Apartments', 'Apartments for city living', 'Browse published apartments from Makazi Go agents.'],
  land: ['Land', 'Land ready for your plans', 'Browse published land listings and contact the responsible agents.'],
  hotel: ['Hotels', 'Stays with a warm welcome', 'Browse hotels and guesthouses posted by Makazi Go agents.'],
  commercial: ['Commercial', 'Space for your business', 'Browse published commercial properties and contact their agents.']
};
function updateCategoryHeading() {
  const category = filters.elements.propertyType.value;
  const [label, title, description] = categoryCopy[category] || ['Properties', 'Find a place that fits your life.', 'Browse verified homes, apartments, land, hotels, and commercial spaces across Tanzania.'];
  const heading = document.querySelector('.listings-page-heading');
  heading.querySelector('.eyebrow').textContent = `Makazi Go ${label.toLowerCase()}`;
  heading.querySelector('h1').textContent = title;
  heading.querySelector('p:not(.eyebrow)').textContent = description;
  document.title = `${label} | Makazi Go`;
}
const money = listing => {
  const value = listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice || 0;
  const period = listing.nightlyPrice ? 'night' : listing.monthlyPrice ? 'month' : 'year';
  return `${listing.currency || 'TZS'} ${Number(value).toLocaleString()} / ${period}`;
};
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('Makazi Go returned an invalid response.'); }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function showToast(message) {
  const toast = document.querySelector('#listingToast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3600);
}
function cardMarkup(listing) {
  const cover = imageUrl(listing.coverUrl);
  const enquiryOnly = ['land', 'commercial'].includes(listing.propertyType);
  const facts = enquiryOnly ? 'Contact agent for area and terms' : `${listing.bedrooms || 0} bedrooms · Up to ${listing.maxGuests || 0} guests`;
  const agentName = [listing.agentFirstName, listing.agentLastName].filter(Boolean).join(' ') || listing.agencyName || 'Makazi Go agent';
  const agent = listing.agentId ? `<a class="all-listing-agent" href="/index.html?view=agent&agent=${encodeURIComponent(listing.agentId)}" data-agent-link>${escapeHtml(agentName)}</a>` : `<span class="all-listing-agent">${escapeHtml(agentName)}</span>`;
  return `<article class="all-listing-card" data-listing-id="${escapeHtml(listing.id)}">
    <button class="all-listing-cover" type="button" aria-label="Open ${escapeHtml(listing.title)}"><img src="${escapeHtml(cover)}" alt="${escapeHtml(listing.title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/ezgif-frame-018.jpg'"><span class="cover-label">View property</span></button>
    <div class="all-listing-copy"><div><h2>${escapeHtml(listing.title)}</h2><p>${escapeHtml([listing.neighborhood, listing.city].filter(Boolean).join(', '))}</p></div><strong>${escapeHtml(money(listing))}</strong><p class="all-listing-meta">${escapeHtml(listing.propertyType || 'Property')} · ${facts}</p><p class="all-listing-agent-row">Posted by ${agent}</p></div>
  </article>`;
}
let searchTimer;
let searchController;
let detailController;
async function loadListings(event, { historyMode = 'replace' } = {}) {
  event?.preventDefault();
  clearTimeout(searchTimer);
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  const values = new FormData(filters);
  const query = new URLSearchParams([...values.entries()].map(([name, value]) => [name, String(value).trim()]).filter(([, value]) => value));
  updateCategoryHeading();
  if (historyMode !== 'none') history[`${historyMode}State`]({ filters: query.toString() }, '', `${location.pathname}${query.size ? `?${query}` : ''}`);
  grid.innerHTML = '<p class="feed-empty">Finding Makazi Go properties...</p>';
  try {
    const result = await api(`/api/listings/discover?${query}`, { signal: controller.signal });
    if (controller.signal.aborted) return;
    const listings = Array.isArray(result.listings) ? result.listings : [];
    resultNote.textContent = `${listings.length} listing${listings.length === 1 ? '' : 's'} available`;
    grid.innerHTML = listings.length ? listings.map(cardMarkup).join('') : '<p class="feed-empty">No listings match these filters yet.</p>';
    grid.querySelectorAll('[data-listing-id]').forEach(card => card.addEventListener('click', () => openDetail(card.dataset.listingId)));
    grid.querySelectorAll('[data-agent-link]').forEach(link => link.addEventListener('click', event => event.stopPropagation()));
  } catch (error) {
    if (error.name === 'AbortError') return;
    resultNote.textContent = '';
    grid.innerHTML = `<p class="feed-empty">${escapeHtml(error.message)}</p>`;
  }
}
function detailMediaMarkup(media, title) {
  return media.map((item, index) => item.mediaType === 'video'
    ? `<video class="listing-page-media ${index === 0 ? 'listing-page-cover-media' : ''}" src="${escapeHtml(imageUrl(item.mediaUrl))}" controls playsinline preload="metadata"></video>`
    : `<img class="listing-page-media ${index === 0 ? 'listing-page-cover-media' : ''}" src="${escapeHtml(imageUrl(item.mediaUrl))}" alt="${escapeHtml(item.caption || title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/ezgif-frame-018.jpg'">`).join('');
}
function detailMarkup(result) {
  const listing = result.listing;
  const media = Array.isArray(result.media) && result.media.length ? result.media : [{ mediaUrl: listing.coverUrl, mediaType: 'image' }];
  const amenities = String(listing.amenities || '').split(',').filter(Boolean);
  const agentName = `${listing.firstName || ''} ${listing.lastName || ''}`.trim() || listing.agencyName || 'Makazi Go agent';
  return `<button class="listing-back-button" type="button" id="backToListings">← All listings</button>
    <div class="listing-page-gallery">${detailMediaMarkup(media, listing.title)}</div>
    <div class="listing-page-layout">
      <article class="listing-page-main"><p class="eyebrow">${escapeHtml(listing.propertyType || 'Makazi Go home')} · ${listing.verifiedAgent ? 'Verified agent' : 'Makazi Go agent'}</p><h1>${escapeHtml(listing.title)}</h1><p class="listing-page-location">${escapeHtml([listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', '))}</p><div class="listing-page-facts"><span>${listing.bedrooms || 0} bedrooms</span><span>${listing.bathrooms || 0} bathrooms</span><span>Up to ${listing.maxGuests || 0} guests</span><span>${escapeHtml(listing.rentalMode || 'Flexible stay')}</span></div><p class="listing-page-description">${escapeHtml(listing.description || 'A carefully presented Makazi Go home in Tanzania.')}</p>${amenities.length ? `<h2>Amenities</h2><div class="listing-page-amenities">${amenities.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}<h2>About this location</h2><p class="listing-page-description">The exact address remains private until booking. Use the map and contact the responsible agent for more information about the area.</p></article>
      <aside class="listing-page-aside"><div class="listing-page-price"><strong>${escapeHtml(money(listing))}</strong><span>${listing.rating ? `★ ${Number(listing.rating).toFixed(1)} (${listing.reviewCount || 0} reviews)` : 'New listing'}</span></div><div class="listing-page-agent"><img src="${escapeHtml(imageUrl(listing.profileImageUrl))}" alt="${escapeHtml(agentName)}" onerror="this.onerror=null;this.src='/assets/staynest-mark.svg'"><div><strong>${escapeHtml(agentName)} ${listing.verifiedAgent ? '✓' : ''}</strong><small>${escapeHtml(listing.agencyName || 'Responsible Makazi Go agent')}</small></div><button type="button" class="outline-btn" id="viewAgent" data-agent-id="${escapeHtml(listing.agentId || '')}">View agent</button></div><button type="button" class="primary listing-page-book" id="requestBooking">Request to book <span>→</span></button><div class="listing-page-actions"><button type="button" class="outline-btn" id="saveListing">${listing.saved ? 'Saved' : 'Save'}</button><button type="button" class="outline-btn" id="shareListing">Share</button><button type="button" class="outline-btn" id="compareListing">Compare</button><button type="button" class="outline-btn" id="messageAgent">Message agent</button><button type="button" class="outline-btn" id="reportListing">Report listing</button></div></aside>
    </div>`;
}
async function getCsrf() { return (await api('/api/auth/csrf')).token; }
function showListingResults({ historyMode = 'none' } = {}) {
  detailController?.abort();
  const url = new URL(location.href);
  url.searchParams.delete('listing');
  if (historyMode !== 'none') history[`${historyMode}State`]({ filters: url.searchParams.toString() }, '', `${url.pathname}${url.search}`);
  inlineDetail.hidden = true;
  filters.hidden = false;
  resultNote.hidden = false;
  grid.hidden = false;
  void loadListings(null, { historyMode: 'none' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function syncFiltersFromUrl() {
  const params = new URLSearchParams(location.search);
  for (const name of ['q', 'propertyType', 'rentalMode', 'sort']) {
    const control = filters.elements.namedItem(name);
    if (!control) continue;
    const value = params.get(name) || '';
    if (control instanceof HTMLSelectElement && ![...control.options].some(option => option.value === value)) continue;
    control.value = value;
  }
  updateCategoryHeading();
}
async function openDetail(id, { updateHistory = true } = {}) {
  detailController?.abort();
  const controller = new AbortController();
  detailController = controller;
  const url = new URL(location.href);
  url.searchParams.set('listing', id);
  if (updateHistory) history.pushState({ listingId: String(id) }, '', `${url.pathname}${url.search}`);
  inlineDetail.hidden = false;
  filters.hidden = true;
  resultNote.hidden = true;
  grid.hidden = true;
  inlineDetail.innerHTML = '<p class="feed-empty" role="status">Loading property details...</p>';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const result = await api(`/api/listings/${encodeURIComponent(id)}/details`, { signal: controller.signal });
    if (controller.signal.aborted) return;
    inlineDetail.innerHTML = sharedDetailMarkup(result);
    wireListingDetail(result.listing, { onBack: () => showListingResults({ historyMode: 'replace' }) });
  } catch (error) {
    if (error.name === 'AbortError') return;
    inlineDetail.innerHTML = `<button class="listing-back-button" type="button" data-return-to-results>← All listings</button><p class="feed-empty">${escapeHtml(error.message)}</p>`;
    inlineDetail.querySelector('[data-return-to-results]').onclick = () => showListingResults({ historyMode: 'replace' });
  }
}
function wireDetail(listing) {
  document.querySelector('#backToListings').onclick = () => showListingResults({ historyMode: 'push' });
  document.querySelector('#viewAgent').onclick = () => { if (listing.agentId) location.href = `/index.html?view=agent&agent=${encodeURIComponent(listing.agentId)}`; };
  document.querySelector('#requestBooking').onclick = () => { location.href = `/index.html?listing=${encodeURIComponent(listing.id)}&book=1`; };
  document.querySelector('#shareListing').onclick = async () => { const url = location.href; if (navigator.share) await navigator.share({ title: listing.title, url }); else { await navigator.clipboard.writeText(url); showToast('Listing link copied'); } };
  document.querySelector('#compareListing').onclick = () => { const items = JSON.parse(localStorage.getItem('staynest.compareListings') || '[]').filter(item => String(item.id) !== String(listing.id)); items.push({ id: listing.id, title: listing.title, city: listing.city, price: listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice }); localStorage.setItem('staynest.compareListings', JSON.stringify(items.slice(-3))); showToast('Listing added to comparison'); };
  document.querySelector('#saveListing').onclick = async event => { try { const csrf = await getCsrf(); const saved = event.currentTarget.textContent.trim() === 'Saved'; await api(`/api/listings/${listing.id}/save`, { method: saved ? 'DELETE' : 'POST', headers: { 'X-CSRF-Token': csrf } }); event.currentTarget.textContent = saved ? 'Save' : 'Saved'; showToast(saved ? 'Removed from saved homes' : 'Saved to your homes'); } catch (error) { showToast(error.message); } };
  document.querySelector('#messageAgent').onclick = () => { if (listing.agentId) location.href = `/index.html?messageAgent=${encodeURIComponent(listing.agentId)}`; };
  document.querySelector('#reportListing').onclick = async () => { const reason = window.prompt('Tell Makazi Go why you are reporting this listing:'); if (!reason) return; try { await api('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await getCsrf() }, body: JSON.stringify({ entityType: 'listing', entityId: listing.id, reason: 'other', details: reason }) }); showToast('Report sent to Makazi Go administrators'); } catch (error) { showToast(error.message); } };
}
filters.addEventListener('submit', event => loadListings(event, { historyMode: 'push' }));
filters.elements.q.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void loadListings(null), 280);
});
filters.querySelectorAll('select').forEach(select => select.addEventListener('change', () => void loadListings(null)));
syncFiltersFromUrl();
window.addEventListener('popstate', () => { syncFiltersFromUrl(); const listingId = new URLSearchParams(location.search).get('listing'); if (listingId) void openDetail(listingId, { updateHistory: false }); else showListingResults(); });
const initialListing = new URLSearchParams(location.search).get('listing');
if (initialListing) void openDetail(initialListing, { updateHistory: false }); else void loadListings();
