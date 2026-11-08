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

function addListingJourneyFields(form) {
  if (form.dataset.journeyFieldsReady) return;
  const rentalMode = form.elements.namedItem('rentalMode');
  if (!rentalMode) return;
  form.dataset.journeyFieldsReady = 'true';
  const error = form.querySelector('.form-error');
  const addField = (labelText, name, inputType = 'text', options = []) => {
    const label = document.createElement('label');
    label.textContent = labelText;
    const control = inputType === 'select'
      ? document.createElement('select')
      : document.createElement('input');
    control.name = name;
    if (inputType === 'select') {
      for (const [value, text] of options) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        control.append(option);
      }
    } else {
      control.type = inputType;
    }
    label.append(control);
    form.insertBefore(label, error);
    return control;
  };
  const journey = addField('Property journey', 'transactionType', 'select', [
    ['stay', 'Stay · short-term booking'],
    ['rent', 'Rent · long-term lease'],
    ['sale', 'Buy · property for sale'],
  ]);
  const category = addField('Property category', 'structureType', 'select', [
    ['', 'Choose a category'],
    ['house', 'Home'],
    ['apartment', 'Apartment'],
    ['room', 'Room'],
    ['land_plot', 'Land'],
    ['hotel', 'Hotel or guesthouse'],
    ['commercial', 'Commercial property'],
    ['serviced_apartment', 'Serviced apartment'],
  ]);
  category.required = true;
  const salePrice = addField('Sale price (TZS)', 'salePrice', 'number');
  salePrice.min = '1';
  salePrice.step = '0.01';
  const landSize = addField('Plot size', 'plotSize', 'number');
  landSize.min = '1';
  landSize.step = '0.01';
  landSize.required = true;
  const landSizeUnit = addField('Plot size unit', 'plotSizeUnit', 'select', [
    ['sqm', 'Square metres'],
    ['acres', 'Acres'],
    ['hectares', 'Hectares'],
  ]);
  const landUse = addField('Land use or zoning', 'landUse');
  landUse.maxLength = 120;
  landUse.required = true;
  const titleStatus = addField('Advertiser-reported title information', 'titleStatus', 'select', [
    ['', 'Choose information available'],
    ['unknown', 'Not confirmed'],
    ['title_deed', 'Title deed reported'],
    ['offer', 'Offer reported'],
    ['customary', 'Customary rights reported'],
    ['other', 'Other documentation'],
  ]);
  titleStatus.required = true;
  const floorArea = addField('Commercial floor area (m²)', 'floorArea', 'number');
  floorArea.min = '1';
  floorArea.step = '0.01';
  floorArea.required = true;
  const commercialUse = addField('Intended commercial use', 'commercialUse', 'select', [
    ['', 'Choose intended use'],
    ['office', 'Office'],
    ['retail', 'Retail or shop'],
    ['hospitality', 'Hospitality'],
    ['warehouse', 'Warehouse or industrial'],
    ['mixed_use', 'Mixed use'],
    ['other', 'Other'],
  ]);
  commercialUse.required = true;
  const categoryNote = document.createElement('small');
  categoryNote.textContent = 'Title information is supplied by the advertiser and is not legal verification.';
  form.insertBefore(categoryNote, error);
  const priceFields = ['nightlyPrice', 'monthlyPrice', 'yearlyPrice'].map(name => form.elements.namedItem(name));
  const categoryRequiredFields = new Set(['plotSize', 'landUse', 'titleStatus', 'floorArea', 'commercialUse']);
  const setFieldVisible = (control, visible) => {
    control.hidden = !visible;
    const wrapper = control.closest('label') || control.previousElementSibling;
    if (wrapper?.tagName === 'LABEL') wrapper.hidden = !visible;
    if ('required' in control && categoryRequiredFields.has(control.name)) control.required = visible;
    if (!visible && categoryRequiredFields.has(control.name)) control.value = '';
  };
  setFieldVisible(rentalMode, false);

  const updateFields = () => {
    const land = category.value === 'land_plot';
    const commercial = category.value === 'commercial';
    const stayOption = [...journey.options].find(option => option.value === 'stay');
    stayOption.disabled = land || commercial;
    if (stayOption.disabled && journey.value === 'stay') journey.value = 'sale';
    const selectedJourney = journey.value;
    rentalMode.value = selectedJourney === 'stay' ? 'short_term' : 'long_term';
    setFieldVisible(salePrice, selectedJourney === 'sale');
    setFieldVisible(priceFields[0], selectedJourney === 'stay');
    setFieldVisible(priceFields[1], selectedJourney === 'rent');
    setFieldVisible(priceFields[2], selectedJourney === 'rent');
    for (const control of [salePrice, ...priceFields]) {
      if (control.hidden) control.value = '';
    }
    for (const control of [landSize, landSizeUnit, landUse, titleStatus]) setFieldVisible(control, land);
    for (const control of [floorArea, commercialUse]) setFieldVisible(control, commercial);
    categoryNote.hidden = !land;
  };
  journey.addEventListener('change', updateFields);
  category.addEventListener('change', updateFields);
  updateFields();
}

const listingFormObserver = new MutationObserver(() => {
  const form = document.querySelector('#agentListingForm');
  if (form) addListingJourneyFields(form);
});
listingFormObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
window.addEventListener('error', event => {
  if (event.error) console.error('Makazi Go client error', event.error);
});
window.addEventListener('unhandledrejection', event => {
  console.error('Makazi Go asynchronous error', event.reason);
});
document.addEventListener('keydown', trapModalFocus);
updateConnectionStatus();
enhanceModal();

if ('serviceWorker' in navigator && window.location.protocol === 'http:') {
  navigator.serviceWorker.register('/service-worker.js').catch(error => {
    console.warn('Makazi Go offline cache is unavailable', error);
  });
}
