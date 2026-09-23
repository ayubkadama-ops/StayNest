const grid = document.querySelector('#allListingsGrid');
const detail = document.querySelector('#listingDetailPage');
const filters = document.querySelector('#listingFilters');
const resultNote = document.querySelector('#listingsResultNote');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const imageUrl = value => /^(https?:\/\/|\/)/i.test(String(value || '')) ? String(value) : '/assets/ezgif-frame-018.jpg';
const money = listing => {
  const value = listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice || 0;
  const period = listing.nightlyPrice ? 'night' : listing.monthlyPrice ? 'month' : 'year';
  return `${listing.currency || 'TZS'} ${Number(value).toLocaleString()} / ${period}`;
};
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('StayNest returned an invalid response.'); }
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
  return `<article class="all-listing-card" data-listing-id="${escapeHtml(listing.id)}">
    <button class="all-listing-cover" type="button" aria-label="Open ${escapeHtml(listing.title)}"><img src="${escapeHtml(cover)}" alt="${escapeHtml(listing.title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/ezgif-frame-018.jpg'"><span class="cover-label">View home</span></button>
    <div class="all-listing-copy"><div><h2>${escapeHtml(listing.title)}</h2><p>${escapeHtml([listing.neighborhood, listing.city].filter(Boolean).join(', '))}</p></div><strong>${escapeHtml(money(listing))}</strong><p class="all-listing-meta">${escapeHtml(listing.propertyType || 'Home')} · ${listing.bedrooms || 0} bedroom${Number(listing.bedrooms) === 1 ? '' : 's'} · Up to ${listing.maxGuests || 0} guests</p></div>
  </article>`;
}
async function loadListings(event) {
  event?.preventDefault();
  const values = new FormData(filters);
  const query = new URLSearchParams([...values.entries()].filter(([, value]) => value));
  grid.innerHTML = '<p class="feed-empty">Finding StayNest homes...</p>';
  try {
    const result = await api(`/api/listings/discover?${query}`);
    const listings = Array.isArray(result.listings) ? result.listings : [];
    resultNote.textContent = `${listings.length} listing${listings.length === 1 ? '' : 's'} available`;
    grid.innerHTML = listings.length ? listings.map(cardMarkup).join('') : '<p class="feed-empty">No listings match these filters yet.</p>';
    grid.querySelectorAll('[data-listing-id]').forEach(card => card.addEventListener('click', () => openDetail(card.dataset.listingId)));
  } catch (error) {
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
  const agentName = `${listing.firstName || ''} ${listing.lastName || ''}`.trim() || listing.agencyName || 'StayNest agent';
  return `<button class="listing-back-button" type="button" id="backToListings">← All listings</button>
    <div class="listing-page-gallery">${detailMediaMarkup(media, listing.title)}</div>
    <div class="listing-page-layout">
      <article class="listing-page-main"><p class="eyebrow">${escapeHtml(listing.propertyType || 'StayNest home')} · ${listing.verifiedAgent ? 'Verified agent' : 'StayNest agent'}</p><h1>${escapeHtml(listing.title)}</h1><p class="listing-page-location">${escapeHtml([listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', '))}</p><div class="listing-page-facts"><span>${listing.bedrooms || 0} bedrooms</span><span>${listing.bathrooms || 0} bathrooms</span><span>Up to ${listing.maxGuests || 0} guests</span><span>${escapeHtml(listing.rentalMode || 'Flexible stay')}</span></div><p class="listing-page-description">${escapeHtml(listing.description || 'A carefully presented StayNest home in Tanzania.')}</p>${amenities.length ? `<h2>Amenities</h2><div class="listing-page-amenities">${amenities.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}<h2>About this location</h2><p class="listing-page-description">The exact address remains private until booking. Use the map and contact the responsible agent for more information about the area.</p></article>
      <aside class="listing-page-aside"><div class="listing-page-price"><strong>${escapeHtml(money(listing))}</strong><span>${listing.rating ? `★ ${Number(listing.rating).toFixed(1)} (${listing.reviewCount || 0} reviews)` : 'New listing'}</span></div><div class="listing-page-agent"><img src="${escapeHtml(imageUrl(listing.profileImageUrl))}" alt="${escapeHtml(agentName)}" onerror="this.onerror=null;this.src='/assets/staynest-mark.svg'"><div><strong>${escapeHtml(agentName)} ${listing.verifiedAgent ? '✓' : ''}</strong><small>${escapeHtml(listing.agencyName || 'Responsible StayNest agent')}</small></div><button type="button" class="outline-btn" id="viewAgent" data-agent-id="${escapeHtml(listing.agentId || '')}">View agent</button></div><button type="button" class="primary listing-page-book" id="requestBooking">Request to book <span>→</span></button><div class="listing-page-actions"><button type="button" class="outline-btn" id="saveListing">${listing.saved ? 'Saved' : 'Save'}</button><button type="button" class="outline-btn" id="shareListing">Share</button><button type="button" class="outline-btn" id="compareListing">Compare</button><button type="button" class="outline-btn" id="messageAgent">Message agent</button><button type="button" class="outline-btn" id="reportListing">Report listing</button></div></aside>
    </div>`;
}
async function getCsrf() { return (await api('/api/auth/csrf')).token; }
async function openDetail(id) {
  location.href = `/listing-detail.html?listing=${encodeURIComponent(id)}`;
}
function wireDetail(listing) {
  document.querySelector('#backToListings').onclick = () => { history.pushState({}, '', '/listings.html'); detail.hidden = true; filters.hidden = false; resultNote.hidden = false; grid.hidden = false; loadListings(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  document.querySelector('#viewAgent').onclick = () => { if (listing.agentId) location.href = `/index.html?view=agent&agent=${encodeURIComponent(listing.agentId)}`; };
  document.querySelector('#requestBooking').onclick = () => { location.href = `/index.html?listing=${encodeURIComponent(listing.id)}&book=1`; };
  document.querySelector('#shareListing').onclick = async () => { const url = location.href; if (navigator.share) await navigator.share({ title: listing.title, url }); else { await navigator.clipboard.writeText(url); showToast('Listing link copied'); } };
  document.querySelector('#compareListing').onclick = () => { const items = JSON.parse(localStorage.getItem('staynest.compareListings') || '[]').filter(item => String(item.id) !== String(listing.id)); items.push({ id: listing.id, title: listing.title, city: listing.city, price: listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice }); localStorage.setItem('staynest.compareListings', JSON.stringify(items.slice(-3))); showToast('Listing added to comparison'); };
  document.querySelector('#saveListing').onclick = async event => { try { const csrf = await getCsrf(); const saved = event.currentTarget.textContent.trim() === 'Saved'; await api(`/api/listings/${listing.id}/save`, { method: saved ? 'DELETE' : 'POST', headers: { 'X-CSRF-Token': csrf } }); event.currentTarget.textContent = saved ? 'Save' : 'Saved'; showToast(saved ? 'Removed from saved homes' : 'Saved to your homes'); } catch (error) { showToast(error.message); } };
  document.querySelector('#messageAgent').onclick = () => { if (listing.agentId) location.href = `/index.html?messageAgent=${encodeURIComponent(listing.agentId)}`; };
  document.querySelector('#reportListing').onclick = async () => { const reason = window.prompt('Tell StayNest why you are reporting this listing:'); if (!reason) return; try { await api('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await getCsrf() }, body: JSON.stringify({ entityType: 'listing', entityId: listing.id, reason: 'other', details: reason }) }); showToast('Report sent to StayNest administrators'); } catch (error) { showToast(error.message); } };
}
filters.addEventListener('submit', loadListings);
window.addEventListener('popstate', () => { if (new URLSearchParams(location.search).get('listing')) openDetail(new URLSearchParams(location.search).get('listing')); else document.querySelector('#backToListings')?.click(); });
const initialListing = new URLSearchParams(location.search).get('listing');
if (initialListing) openDetail(initialListing); else loadListings();
