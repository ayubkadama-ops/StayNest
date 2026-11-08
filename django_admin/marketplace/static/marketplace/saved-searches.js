const saveButton = document.querySelector('[data-save-search]');

saveButton?.addEventListener('click', async () => {
  const form = document.querySelector('.filter-bar[action="/properties/"]');
  const message = document.querySelector('[data-save-search-status]');
  if (!form || !message) return;

  const filters = {};
  for (const [key, rawValue] of new FormData(form)) {
    const value = String(rawValue).trim();
    if (!value || key === 'page' || (key === 'sort' && value === 'new')) continue;
    if (key in filters) {
      filters[key] = Array.isArray(filters[key]) ? [...filters[key], value] : [filters[key], value];
    } else {
      filters[key] = value;
    }
  }
  if (!Object.keys(filters).length) {
    message.textContent = 'Choose at least one search filter before saving.';
    return;
  }

  const nameParts = ['q', 'location', 'district', 'neighborhood', 'propertyType', 'transactionType']
    .map((key) => filters[key])
    .filter((value) => typeof value === 'string');
  const defaultName = nameParts.join(' · ') || 'My property search';
  const name = window.prompt('Name this search', defaultName);
  if (name === null) return;
  if (!name.trim()) {
    message.textContent = 'Enter a name for this search.';
    return;
  }

  saveButton.disabled = true;
  message.textContent = '';
  try {
    const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    const csrf = await csrfResponse.json();
    if (!csrfResponse.ok || typeof csrf.token !== 'string') {
      throw new Error(csrf.error || 'Sign in to save this search.');
    }
    const response = await fetch('/api/search-alerts', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token },
      body: JSON.stringify({ name: name.trim(), filters, frequency: 'daily' }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(response.status === 401 ? 'Sign in to save this search.' : result.error || `Request failed (${response.status})`);
    }
    message.textContent = 'Search saved.';
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : 'This search could not be saved.';
  } finally {
    saveButton.disabled = false;
  }
});
