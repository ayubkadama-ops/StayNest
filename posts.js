const feed = document.querySelector('#feed');
const sort = document.querySelector('#sort');

const avatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23dfe9e2"/%3E%3Ccircle cx="50" cy="36" r="18" fill="%2372807b"/%3E%3Cpath d="M15 94c4-25 17-38 35-38s31 13 35 38" fill="%2372807b"/%3E%3C/svg%3E';
const safeMedia = value => {
  const url = String(value || '').trim();
  return /^(?:https?:\/\/|\/|data:image\/(?:svg\+xml|png|jpeg|webp);)/i.test(url) ? url : avatar;
};
const bustMedia = value => {
  const url = safeMedia(value);
  return url.startsWith('/') ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : url;
};
let toastTimer;
function showSystemMessage(message, type='success') {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  const error = type === 'error' || /invalid|unable|error|failed|could not|unavailable/i.test(String(message));
  toast.querySelector('.toast-message').textContent = String(message);
  toast.querySelector('.toast-icon').textContent = error ? '!' : '✓';
  toast.classList.toggle('error', error);
  toast.hidden = false;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  const progress = toast.querySelector('.toast-progress');
  progress.style.animation = 'none';
  void progress.offsetWidth;
  progress.style.animation = 'toast-countdown 4.2s linear forwards';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 320);
  }, 4200);
}
document.querySelector('#toast .toast-close')?.addEventListener('click', () => {
  clearTimeout(toastTimer);
  document.querySelector('#toast').classList.remove('show');
  setTimeout(() => { document.querySelector('#toast').hidden = true; }, 320);
});

function showGuestPrompt(action) {
  const existing = document.querySelector('.posts-auth-overlay');
  if (existing) return;
  const overlay = document.createElement('div');
  overlay.className = 'post-booking-overlay posts-auth-overlay';
  overlay.innerHTML = `
    <div class="post-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="postsAuthTitle">
      <button class="icon-btn post-booking-close" aria-label="Close">×</button>
      <p class="eyebrow">Members only</p>
      <h2 id="postsAuthTitle">Sign in to request a booking</h2>
      <p class="booking-help">Create a free StayNest account or sign in to continue. Your approved posts and browsing remain available as a guest.</p>
      <div class="auth-prompt-actions">
        <a class="primary" href="/index.html?auth=signup">Create an account <span>→</span></a>
        <a class="outline-btn" href="/index.html?auth=login">Already have an account? Sign in</a>
      </div>
    </div>`;
  const close = () => overlay.remove();
  overlay.querySelector('.post-booking-close').onclick = close;
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.body.append(overlay);
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const badge = active => active
  ? '<span class="agent-badge" role="img" aria-label="Verified agent" title="Verified agent">✓</span>'
  : '';

document.addEventListener('error', event => {
  const image = event.target;
  if (image instanceof HTMLImageElement && !image.dataset.avatarFallback) {
    image.dataset.avatarFallback = 'true';
    image.src = avatar;
  }
}, true);

async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Please sign in to interact with posts');
  return (await response.json()).token;
}

function showLoginOnAuthenticationError(error) {
  if (!error.message.includes('sign in') && !error.message.includes('Authentication')) return false;
  showGuestPrompt('interact with posts');
  return true;
}

function bookingDialog(card) {
  const listingId = Number(card.dataset.postId);
  const title = card.querySelector('.post-copy h2')?.textContent || 'this property';
  const overlay = document.createElement('div');
  overlay.className = 'post-booking-overlay';
  overlay.innerHTML = `
    <div class="post-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="postBookingTitle">
      <button class="icon-btn post-booking-close" aria-label="Close">×</button>
      <p class="eyebrow">Booking request</p>
      <h2 id="postBookingTitle">${escapeHtml(title)}</h2>
      <p class="booking-help">Choose your dates and send a request to the listing agent.</p>
      <form>
        <label>Check-in<input name="checkIn" type="date" required></label>
        <label>Check-out<input name="checkOut" type="date" required></label>
        <label>Guests<input name="guests" type="number" min="1" max="20" value="1" required></label>
        <p class="form-error" role="alert"></p>
        <button class="primary" type="submit">Request to book <span>→</span></button>
      </form>
    </div>`;

  document.body.append(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.post-booking-close').onclick = close;
  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('form').onsubmit = event => submitBooking(event, overlay, card, listingId);
}

async function submitBooking(event, overlay, card, listingId) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorNode = form.querySelector('.form-error');
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const token = await getCsrfToken();
    const response = await fetch('/api/bookings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({
        listingId,
        checkIn: form.elements.checkIn.value,
        checkOut: form.elements.checkOut.value,
        guests: Number(form.elements.guests.value)
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to send booking request');
    overlay.remove();
    showSystemMessage(`Booking request ${data.bookingCode || ''} sent to the agent.`);
  } catch (error) {
    if (showLoginOnAuthenticationError(error)) return;
    errorNode.textContent = error.message;
    submit.disabled = false;
  }
}

async function viewPost(card) {
  if (!card || card.dataset.viewed === 'true') return;
  const counter = card.querySelector('[data-views],[data-post-views]');
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(card.dataset.postId)}/view`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to record post view');
    card.dataset.viewed = 'true';
    if (counter && data.views !== undefined) counter.textContent = `${data.views} views`;
  } catch (error) {
    delete card.dataset.viewed;
    console.warn('StayNest view tracking failed', error.message);
  }
}

async function likePost(card, event) {
  event.stopPropagation();
  const button = event.currentTarget;
  const liked = card.dataset.liked === 'true';
  button.disabled = true;
  try {
    const token = await getCsrfToken();
    const response = await fetch(`/api/listings/${card.dataset.postId}/like`, {
      method: liked ? 'DELETE' : 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': token }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to update like');
    card.dataset.liked = String(data.liked);
    button.classList.toggle('liked', data.liked);
    button.setAttribute('aria-pressed', String(data.liked));
    card.querySelector('[data-likes]').textContent = `${data.likes} likes`;
  } catch (error) {
    button.setAttribute('aria-label', error.message);
  } finally {
    button.disabled = false;
  }
}

function renderPost(post) {
  const name = escapeHtml(`${post.firstName || ''} ${post.lastName || ''}`.trim() || 'StayNest agent');
  const agentId = Number(post.agentId || post.agent_user_id);
  const media = post.mediaType === 'video'
    ? `<video class="post-media" src="${escapeHtml(bustMedia(post.mediaUrl))}" controls playsinline preload="metadata"></video>`
    : `<img class="post-media" src="${escapeHtml(bustMedia(post.mediaUrl))}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.onerror=null;this.src='${avatar}'">`;

  return `
    <article class="post-card" data-post-id="${post.id}" data-agent-id="${agentId}" data-liked="${post.liked ? 'true' : 'false'}">
      <a class="post-byline" href="/index.html?agent=${agentId}&from=post" aria-label="Open ${name}'s agent profile">
        <img class="post-avatar" src="${escapeHtml(bustMedia(post.profileImageUrl))}" alt="" onerror="this.onerror=null;this.src='${avatar}'">
        <div><strong>${name}${badge(post.badgeLabel)}</strong><small>${escapeHtml(post.city || '')} · ${post.mediaType === 'video' ? 'Video tour' : 'Photo post'}</small></div>
      </a>
      ${media}
      <div class="post-copy">
        <h2>${escapeHtml(post.title)}</h2>
        <p>${escapeHtml(post.description || '')}</p>
        <div class="post-meta">
          <span>★ ${escapeHtml(post.rating || '0')} · ${escapeHtml(post.reviewCount || 0)} reviews</span>
          <span><button class="post-like-button ${post.liked ? 'liked' : ''}" data-like aria-label="Like post" aria-pressed="${Boolean(post.liked)}">♥</button> <b data-likes>${escapeHtml(post.likes || 0)} likes</b> · <b data-views>${escapeHtml(post.views || 0)} views</b></span>
        </div>
        <button class="primary small post-book-button" data-book-post type="button">Book this place</button>
      </div>
    </article>`;
}

function bindPostCard(card) {
  viewPost(card);
  card.addEventListener('pointerenter', () => viewPost(card), { once: true });
  card.querySelector('[data-like]').addEventListener('click', event => likePost(card, event));
  card.querySelector('[data-book-post]').addEventListener('click', event => {
    event.stopPropagation();
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(result => result?.user ? bookingDialog(card) : showGuestPrompt('book this place'))
      .catch(() => showGuestPrompt('book this place'));
  });
  card.addEventListener('click', event => {
    if (event.target.closest('a,button,video')) return;
    void viewPost(card);
    const agentId = Number(card.dataset.agentId);
    if (agentId) window.location.href = `/index.html?agent=${agentId}&from=post`;
  });
}

function renderEmptyFeed() {
  return '<div class="feed-empty">No approved agent posts are available yet. Check back after an agent listing is approved.<br><a class="primary small" href="/">Explore stays</a></div>';
}

async function load() {
  const response = await fetch(`/api/posts?sort=${sort.value}`, {
    credentials: 'same-origin',
    cache: 'no-store'
  });
  const data = await response.json();
  if (!response.ok) {
    feed.innerHTML = '<div class="feed-empty">The posts feed is temporarily unavailable. Please try again shortly.</div>';
    return;
  }

  async function showInitialGuestGate() {
    if (sessionStorage.getItem('stayNest.memberGateShown') === 'true') return;
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const result = response.ok ? await response.json() : null;
      if (result?.user) return;
    } catch {
      return;
    }
    sessionStorage.setItem('stayNest.memberGateShown', 'true');
    showGuestPrompt('request a booking');
  }
  feed.innerHTML = data.posts.length ? data.posts.map(renderPost).join('') : renderEmptyFeed();
  feed.querySelectorAll('.post-card').forEach(bindPostCard);
}

function refreshFeed() {
  load().catch(() => {
    feed.innerHTML = '<div class="feed-empty">The posts feed is temporarily unavailable.</div>';
  });
}

sort.addEventListener('change', refreshFeed);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshFeed();
});
window.addEventListener('focus', refreshFeed);
window.setInterval(() => {
  if (document.visibilityState === 'visible') refreshFeed();
}, 30000);
refreshFeed();
showInitialGuestGate();
