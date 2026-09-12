const modal = document.querySelector('#modal');
const toast = document.querySelector('#toast');
let lastFocusedElement = null;

function announce(message) {
  if (!toast || !message) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function updateConnectionStatus() {
  document.documentElement.dataset.network = navigator.onLine ? 'online' : 'offline';
  if (!navigator.onLine) announce('You are offline. Changes will resume when your connection returns.');
}

function trapModalFocus(event) {
  if (!modal?.classList.contains('open') || event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.disabled && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function enhanceModal() {
  if (!modal) return;
  const observer = new MutationObserver(() => {
    const open = modal.classList.contains('open');
    if (open) {
      lastFocusedElement = document.activeElement;
      const first = modal.querySelector('button, [href], input, select, textarea');
      first?.focus();
      modal.setAttribute('aria-hidden', 'false');
    } else {
      modal.setAttribute('aria-hidden', 'true');
      lastFocusedElement?.focus?.();
      lastFocusedElement = null;
    }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  modal.addEventListener('click', event => {
    if (event.target === modal) document.querySelector('#modalClose')?.click();
  });
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
window.addEventListener('error', event => {
  if (event.error) console.error('StayNest client error', event.error);
});
window.addEventListener('unhandledrejection', event => {
  console.error('StayNest asynchronous error', event.reason);
});
document.addEventListener('keydown', trapModalFocus);
updateConnectionStatus();
enhanceModal();

if ('serviceWorker' in navigator && window.location.protocol === 'http:') {
  navigator.serviceWorker.register('/service-worker.js').catch(error => {
    console.warn('StayNest offline cache is unavailable', error);
  });
}
