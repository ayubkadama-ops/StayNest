const page = document.querySelector('#listingDetailPage');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const mediaUrl = value => /^(https?:\/\/|\/)/i.test(String(value || '')) ? String(value) : '/assets/ezgif-frame-018.jpg';
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
    : `<img class="listing-page-media ${index === 0 ? 'listing-page-cover-media' : ''}" src="${escapeHtml(mediaUrl(item.mediaUrl))}" alt="${escapeHtml(item.caption || title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/ezgif-frame-018.jpg'">`).join('');
}
function markup(result) {
  const listing = result.listing;
  const media = Array.isArray(result.media) && result.media.length ? result.media : [{ mediaUrl: listing.coverUrl, mediaType: 'image' }];
  const amenities = String(listing.amenities || '').split(',').filter(Boolean);
  const agentName = `${listing.firstName || ''} ${listing.lastName || ''}`.trim() || listing.agencyName || 'StayNest agent';
  return `<button class="listing-back-button" type="button" id="backToListings">← All listings</button>
    <div class="listing-page-gallery">${mediaMarkup(media, listing.title)}</div>
    <div class="listing-page-layout">
      <article class="listing-page-main"><p class="eyebrow">${escapeHtml(listing.propertyType || 'StayNest home')} · ${listing.verifiedAgent ? 'Verified agent' : 'StayNest agent'}</p><h1>${escapeHtml(listing.title)}</h1><p class="listing-page-location">${escapeHtml([listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', '))}</p><div class="listing-page-facts"><span>${listing.bedrooms || 0} bedrooms</span><span>${listing.bathrooms || 0} bathrooms</span><span>Up to ${listing.maxGuests || 0} guests</span><span>${escapeHtml(listing.rentalMode || 'Flexible stay')}</span></div><p class="listing-page-description">${escapeHtml(listing.description || 'A carefully presented StayNest home in Tanzania.')}</p>${amenities.length ? `<h2>Amenities</h2><div class="listing-page-amenities">${amenities.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}<h2>About this location</h2><p class="listing-page-description">The exact address remains private until booking. Contact the responsible agent for more information about the area.</p></article>
      <aside class="listing-page-aside"><div class="listing-page-price"><strong>${escapeHtml(money(listing))}</strong><span>${listing.rating ? `★ ${Number(listing.rating).toFixed(1)} (${listing.reviewCount || 0} reviews)` : 'New listing'}</span></div><div class="listing-page-agent"><img src="${escapeHtml(mediaUrl(listing.profileImageUrl))}" alt="${escapeHtml(agentName)}" onerror="this.onerror=null;this.src='/assets/staynest-mark.svg'"><div><strong>${escapeHtml(agentName)} ${listing.verifiedAgent ? '✓' : ''}</strong><small>${escapeHtml(listing.agencyName || 'Responsible StayNest agent')}</small></div><button type="button" class="outline-btn" id="viewAgent" data-agent-id="${escapeHtml(listing.agentId || '')}">View agent</button></div><button type="button" class="primary listing-page-book" id="requestBooking">Request to book <span>→</span></button><div class="listing-page-actions"><button type="button" class="outline-btn" id="saveListing">${listing.saved ? 'Saved' : 'Save'}</button><button type="button" class="outline-btn" id="shareListing">Share</button><button type="button" class="outline-btn" id="compareListing">Compare</button><button type="button" class="outline-btn" id="messageAgent">Message agent</button><button type="button" class="outline-btn" id="reportListing">Report listing</button></div></aside>
    </div>`;
}
function wire(listing) {
  document.querySelector('#backToListings').onclick = () => { location.href = '/listings.html'; };
  document.querySelector('#viewAgent').onclick = () => { if (listing.agentId) location.href = `/index.html?view=agent&agent=${encodeURIComponent(listing.agentId)}`; };
  document.querySelector('#requestBooking').onclick = () => { location.href = `/index.html?listing=${encodeURIComponent(listing.id)}&book=1`; };
  document.querySelector('#shareListing').onclick = async () => {
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); toast('Listing link copied'); }
    } catch (error) { if (error.name !== 'AbortError') toast('Unable to share this listing'); }
  };
  document.querySelector('#compareListing').onclick = () => {
    const items = JSON.parse(localStorage.getItem('staynest.compareListings') || '[]').filter(item => String(item.id) !== String(listing.id));
    items.push({ id: listing.id, title: listing.title, city: listing.city, price: listing.nightlyPrice || listing.monthlyPrice || listing.yearlyPrice });
    localStorage.setItem('staynest.compareListings', JSON.stringify(items.slice(-3)));
    toast('Listing added to comparison');
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
    const reason = window.prompt('Tell StayNest why you are reporting this listing:');
    if (!reason) return;
    try {
      await api('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: JSON.stringify({ entityType: 'listing', entityId: listing.id, reason: 'other', details: reason }) });
      toast('Report sent to StayNest administrators');
    } catch (error) { toast(error.message); }
  };
}
const menu = document.querySelector('.menu');
menu?.addEventListener('click', () => {
  const open = document.body.classList.toggle('mobile-nav-open');
  menu.setAttribute('aria-expanded', String(open));
});
const id = new URLSearchParams(location.search).get('listing');
if (!id) location.replace('/listings.html');
else api(`/api/listings/${encodeURIComponent(id)}/details`).then(result => { page.innerHTML = markup(result); wire(result.listing); }).catch(error => { page.innerHTML = `<p class="feed-empty">${escapeHtml(error.message)}</p><a class="primary" href="/listings.html">Back to listings</a>`; });
