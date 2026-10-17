(() => {
  const form = document.querySelector('[data-agent-listing-form]');
  const grid = form?.querySelector('.form-grid');
  if (!form || !grid) return;

  const fieldLabels = new Map([...grid.querySelectorAll('label')].map(label => {
    const field = label.querySelector('input, select, textarea');
    return field ? [field.name, label] : [null, null];
  }).filter(([name]) => name));
  const field = name => form.elements.namedItem(name);
  const label = name => fieldLabels.get(name);
  const geoFields = grid.querySelector('.geo-fields');
  const locationMap = form.querySelector('[data-listing-map]');
  const locationStatus = form.querySelector('[data-geocode-status]');
  const submit = form.querySelector('[type="submit"]');
  const formMessage = form.querySelector('[data-form-message]');
  const category = field('structureType');
  let map;
  let locationMarker;
  const steps = [
    { name: 'Property type', title: 'What are you listing?' },
    { name: 'Location', title: 'Where is the property?' },
    { name: 'Details and price', title: 'Tell customers what is available' },
    { name: 'Amenities', title: 'What makes this property stand out?' },
    { name: 'Documents and photos', title: 'Add verification and media' },
    { name: 'Review', title: 'Review your listing' }
  ];

  const wizard = document.createElement('div');
  wizard.className = 'listing-wizard';
  wizard.innerHTML = `<div class="listing-wizard-head"><p class="eyebrow">Agent listing</p><strong data-wizard-step-label></strong></div><div class="listing-wizard-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="1"><span></span></div>`;
  const progress = wizard.querySelector('.listing-wizard-progress');
  const progressFill = progress.querySelector('span');
  const stepLabel = wizard.querySelector('[data-wizard-step-label]');
  const panels = steps.map((step, index) => {
    const panel = document.createElement('section');
    panel.className = 'listing-wizard-panel';
    panel.dataset.listingStep = String(index);
    panel.hidden = index !== 0;
    panel.setAttribute('aria-labelledby', `listing-step-title-${index}`);
    panel.innerHTML = `<h3 id="listing-step-title-${index}">${step.title}</h3>`;
    wizard.append(panel);
    return panel;
  });

  const move = (panel, names) => names.forEach(name => {
    const item = label(name);
    if (item) panel.append(item);
  });
  const categoriesPanel = panels[0];
  const locationPanel = panels[1];
  const detailsPanel = panels[2];
  const amenitiesPanel = panels[3];
  const uploadPanel = panels[4];
  const reviewPanel = panels[5];

  move(categoriesPanel, ['structureType']);
  const categoryHelp = document.createElement('p');
  categoryHelp.className = 'listing-wizard-help';
  categoryHelp.dataset.categoryHelp = '';
  categoriesPanel.append(categoryHelp);
  move(locationPanel, ['city', 'addressLine1']);
  if (geoFields) locationPanel.append(geoFields);
  move(detailsPanel, ['title', 'description']);

  const stayFields = document.createElement('div');
  stayFields.className = 'listing-wizard-field-grid';
  stayFields.dataset.stayFields = '';
  move(stayFields, ['rentalMode', 'bedrooms', 'bathrooms', 'maxGuests', 'bookingMode']);
  const privacyLabel = document.createElement('label');
  privacyLabel.innerHTML = 'Privacy type<select name="privacyType"><option value="">Not applicable</option><option value="entire_place">Entire place</option><option value="private_room">Private room</option><option value="shared_room">Shared room</option></select>';
  stayFields.append(privacyLabel);
  const apartmentBedsLabel = document.createElement('label');
  apartmentBedsLabel.innerHTML = 'Number of beds<input name="beds" type="number" min="0" max="99" step="1" placeholder="e.g. 2">';
  apartmentBedsLabel.dataset.apartmentBeds = '';
  apartmentBedsLabel.hidden = true;
  stayFields.append(apartmentBedsLabel);
  const landFields = document.createElement('div');
  landFields.className = 'listing-wizard-field-grid';
  landFields.dataset.landFields = '';
  landFields.hidden = true;
  landFields.innerHTML = '<label>Plot size<input name="plotSize" type="number" min="1" step="0.01" placeholder="e.g. 600" data-category-detail><select name="plotSizeUnit" aria-label="Plot size unit"><option value="sqm">Square metres</option><option value="acres">Acres</option><option value="hectares">Hectares</option></select></label><label>Land use or zoning<input name="landUse" maxlength="120" placeholder="Residential, agricultural, mixed-use" data-category-detail></label>';
  const commercialFields = document.createElement('div');
  commercialFields.className = 'listing-wizard-field-grid';
  commercialFields.dataset.commercialFields = '';
  commercialFields.hidden = true;
  commercialFields.innerHTML = '<label>Floor area (m²)<input name="floorArea" type="number" min="1" step="0.01" placeholder="e.g. 120" data-category-detail></label><label>Commercial use<select name="commercialUse" data-category-detail><option value="">Choose use</option><option value="office">Office</option><option value="retail">Retail or shop</option><option value="hospitality">Hospitality</option><option value="warehouse">Warehouse or industrial</option><option value="mixed_use">Mixed use</option><option value="other">Other</option></select></label>';
  detailsPanel.append(stayFields, landFields, commercialFields);

  const priceFields = document.createElement('div');
  priceFields.className = 'listing-wizard-field-grid';
  priceFields.dataset.priceFields = '';
  move(priceFields, ['nightlyPrice', 'monthlyPrice', 'yearlyPrice']);
  detailsPanel.append(priceFields);
  const amenityOptions = {
    house: ['Garden', 'Private yard', 'Fenced property', 'Family kitchen', 'Parking', 'Storage', 'Balcony', 'Backup water'],
    apartment: ['Balcony', 'Elevator', 'Secure entry', 'Backup generator', 'Swimming pool', 'Gym', 'Parking', 'Air conditioning', 'Laundry'],
    serviced_apartment: ['Balcony', 'Elevator', 'Secure entry', 'Backup generator', 'Swimming pool', 'Gym', 'Parking', 'Housekeeping', 'Wi-Fi'],
    room: ['Shared kitchen', 'Shared bathroom', 'Secure entry', 'Wi-Fi', 'Laundry', 'Parking'],
    hotel: ['Restaurant', 'Swimming pool', 'Conference room', 'Security', 'Parking', 'Generator', 'Laundry', 'Wi-Fi'],
    land_plot: ['Road access', 'Water connection', 'Electricity nearby', 'Fenced plot', 'Surveyed title', 'Drainage'],
    commercial: ['Street frontage', 'Parking', 'Loading access', 'Power backup', 'Fiber internet', 'Security', 'Air conditioning', 'Public transport']
  };
  const amenityChoices = document.createElement('div');
  amenityChoices.className = 'listing-amenity-grid';
  amenitiesPanel.append(amenityChoices);
  const amenitiesField = field('amenities');
  const renderAmenities = () => {
    const selected = new Set(String(amenitiesField.value || '').split(',').map(item => item.trim()).filter(Boolean));
    amenityChoices.replaceChildren();
    for (const amenity of amenityOptions[category.value] || amenityOptions.house) {
      const choice = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = amenity;
      checkbox.checked = selected.has(amenity);
      checkbox.addEventListener('change', () => {
        amenitiesField.value = [...amenityChoices.querySelectorAll('input:checked')].map(input => input.value).join(',');
      });
      const text = document.createElement('span');
      text.textContent = amenity;
      choice.append(checkbox, text);
      amenityChoices.append(choice);
    }
  };
  move(uploadPanel, ['document', 'media']);
  const documentTypeLabel = document.createElement('label');
  documentTypeLabel.innerHTML = 'Registration document type<select name="documentType" required><option value="business_license">Business or property registration</option><option value="national_id">National ID</option><option value="passport">Passport</option><option value="drivers_license">Driver license</option></select>';
  uploadPanel.prepend(documentTypeLabel);

  const summary = document.createElement('dl');
  summary.className = 'listing-wizard-summary';
  summary.dataset.wizardSummary = '';
  reviewPanel.append(summary);
  if (formMessage) reviewPanel.append(formMessage);
  if (submit) reviewPanel.append(submit);
  grid.replaceWith(wizard);

  const controls = document.createElement('div');
  controls.className = 'listing-wizard-controls';
  controls.innerHTML = '<button class="button" type="button" data-wizard-back>Back</button><button class="button primary" type="button" data-wizard-next>Continue</button>';
  wizard.append(controls);
  const back = controls.querySelector('[data-wizard-back]');
  const next = controls.querySelector('[data-wizard-next]');
  let currentStep = 0;

  form.querySelectorAll('[required]').forEach(control => { control.required = false; });
  const isLease = () => ['land_plot', 'commercial'].includes(category.value);
  let previousCategory = category.value;
  const setMapPin = (latitude, longitude, message = 'Pin placed') => {
    field('latitude').value = latitude;
    field('longitude').value = longitude;
    if (locationMarker) locationMarker.setLatLng([latitude, longitude]);
    else {
      locationMarker = window.L.marker([latitude, longitude], { draggable: true }).addTo(map);
      locationMarker.on('dragend', () => {
        const point = locationMarker.getLatLng();
        setMapPin(point.lat, point.lng, 'Pin adjusted');
      });
    }
    locationStatus.textContent = `${message}: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
  };
  if (window.L && locationMap) {
    map = window.L.map(locationMap, { scrollWheelZoom: false }).setView([-6.369, 34.888], 6);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    map.on('click', event => setMapPin(event.latlng.lat, event.latlng.lng, 'Pin placed'));
    form.addEventListener('listing:geocode-result', event => {
      const { latitude, longitude } = event.detail;
      map.setView([latitude, longitude], 16);
      setMapPin(latitude, longitude, 'Search result placed. Drag the pin or click the map to adjust');
    });
  }
  const updatePriceFields = () => {
    const lease = isLease();
    const rentalTerm = field('rentalMode').value;
    label('nightlyPrice').hidden = lease || rentalTerm === 'long_term';
    label('monthlyPrice').hidden = !lease && rentalTerm === 'short_term';
    label('yearlyPrice').hidden = !lease && rentalTerm === 'short_term';
    label('monthlyPrice').firstChild.textContent = lease ? 'Monthly lease price (TZS)' : 'Monthly rent (TZS)';
    label('yearlyPrice').firstChild.textContent = lease ? 'Yearly lease price (TZS)' : 'Yearly rent (TZS)';
  };
  const updateCategory = () => {
    const lease = isLease();
    const isLand = category.value === 'land_plot';
    const isCommercial = category.value === 'commercial';
    const isApartment = category.value === 'apartment' || category.value === 'serviced_apartment';
    stayFields.hidden = lease;
    apartmentBedsLabel.hidden = !isApartment;
    landFields.hidden = !isLand;
    commercialFields.hidden = !isCommercial;
    const changedFromLease = ['land_plot', 'commercial'].includes(previousCategory) && !lease;
    field('rentalMode').value = lease ? 'long_term' : changedFromLease ? 'short_term' : field('rentalMode').value || 'short_term';
    field('bookingMode').value = lease ? 'request' : field('bookingMode').value || 'request';
    field('privacyType').value = lease ? '' : field('privacyType').value || 'entire_place';
    previousCategory = category.value;
    if (lease) field('nightlyPrice').value = '';
    updatePriceFields();
    categoryHelp.textContent = isLand
      ? 'Add plot size and land use. Land listings use monthly or yearly lease pricing.'
      : isCommercial
        ? 'Add floor area and intended business use. Commercial listings use monthly or yearly lease pricing.'
        : 'Choose a stay category. You will add privacy, capacity, booking, and rent details next.';
  };
  const addItem = (name, value) => {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = name;
    detail.textContent = value || 'Not provided';
    row.append(term, detail);
    summary.append(row);
  };
  const updateSummary = () => {
    summary.replaceChildren();
    const categoryLabel = category.selectedOptions[0]?.textContent || 'Choose a property type';
    addItem('Property type', categoryLabel);
    addItem('Location', [field('addressLine1').value, field('city').value].filter(Boolean).join(', '));
    addItem('Title', field('title').value);
    if (category.value === 'land_plot') {
      addItem('Plot size', `${field('plotSize').value || 'Not provided'} ${field('plotSizeUnit').selectedOptions[0]?.textContent || ''}`.trim());
      addItem('Land use', field('landUse').value);
    } else if (category.value === 'commercial') {
      addItem('Floor area', field('floorArea').value);
      addItem('Commercial use', field('commercialUse').selectedOptions[0]?.textContent || 'Not selected');
    } else {
      addItem('Rental term', field('rentalMode').selectedOptions[0]?.textContent || 'Not selected');
      addItem('Capacity', `${field('bedrooms').value} bedrooms · ${field('bathrooms').value} bathrooms · ${field('maxGuests').value} guests`);
      if (category.value === 'apartment' || category.value === 'serviced_apartment') addItem('Beds', field('beds').value);
      addItem('Privacy', field('privacyType').selectedOptions[0]?.textContent);
    }
    addItem('Pricing', [field('nightlyPrice').value && `TZS ${field('nightlyPrice').value} nightly`, field('monthlyPrice').value && `TZS ${field('monthlyPrice').value} monthly`, field('yearlyPrice').value && `TZS ${field('yearlyPrice').value} yearly`].filter(Boolean).join(' · '));
    addItem('Amenities and features', amenitiesField.value);
    addItem('Registration document', field('document').files[0]?.name);
    addItem('Photos or videos', `${field('media').files.length} selected · at least 5 required`);
  };
  const showStep = index => {
    currentStep = index;
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
    stepLabel.textContent = `Step ${index + 1} of ${steps.length} · ${steps[index].name}`;
    progress.setAttribute('aria-valuenow', String(index + 1));
    progressFill.style.width = `${((index + 1) / steps.length) * 100}%`;
    back.disabled = index === 0;
    next.hidden = index === steps.length - 1;
    if (index === steps.length - 1) updateSummary();
    if (index === 1 && map) setTimeout(() => map.invalidateSize(), 100);
    if (index === 3) renderAmenities();
    wizard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  };
  const requiredNames = index => {
    if (index === 0) return ['structureType'];
    if (index === 1) return ['city', 'addressLine1'];
    if (index === 2) {
      const names = ['title', 'description'];
      if (category.value === 'land_plot') names.push('plotSize');
      if (category.value === 'commercial') names.push('floorArea', 'commercialUse');
      return names;
    }
    if (index === 4) return ['document'];
    return [];
  };
  const validateStep = index => {
    if (index === 1 && (!field('latitude').value || !field('longitude').value)) {
      form.querySelector('[data-geocode-status]').textContent = 'Find and confirm the property location before continuing.';
      return false;
    }
    for (const name of requiredNames(index)) {
      const control = field(name);
      if (!control.value.trim()) {
        control.setCustomValidity('This field is required.');
        control.reportValidity();
        control.addEventListener('input', () => control.setCustomValidity(''), { once: true });
        return false;
      }
    }
    if (index === 2) {
      const rentalTerm = isLease() ? 'long_term' : field('rentalMode').value;
      const requirePositive = name => {
        const control = field(name);
        if (Number(control.value) > 0) return true;
        control.setCustomValidity('Enter a value greater than zero.');
        control.reportValidity();
        control.addEventListener('input', () => control.setCustomValidity(''), { once: true });
        return false;
      };
      if (category.value === 'land_plot' && !requirePositive('plotSize')) return false;
      if (category.value === 'commercial' && !requirePositive('floorArea')) return false;
      const priceFields = rentalTerm === 'short_term'
        ? ['nightlyPrice']
        : rentalTerm === 'long_term'
          ? ['monthlyPrice', 'yearlyPrice']
          : ['nightlyPrice', 'monthlyPrice', 'yearlyPrice'];
      const hasPrice = rentalTerm === 'both'
        ? Number(field('nightlyPrice').value) > 0 && ['monthlyPrice', 'yearlyPrice'].some(name => Number(field(name).value) > 0)
        : priceFields.some(name => Number(field(name).value) > 0);
      if (!hasPrice) {
        const control = field(priceFields[0]);
        control.setCustomValidity('Enter a price greater than zero.');
        control.reportValidity();
        control.addEventListener('input', () => control.setCustomValidity(''), { once: true });
        formMessage.textContent = 'Enter a rent or lease price to continue.';
        return false;
      }
    }
    if (index === 4) {
      if (!field('document').files.length) return false;
      if (field('media').files.length < 5) {
        formMessage.textContent = 'Add at least five property photos or videos to continue.';
        return false;
      }
    }
    if (formMessage) formMessage.textContent = '';
    return true;
  };
  const storeCategoryDetails = () => {
    const marker = '\n\nProperty details:\n';
    const description = field('description').value.split(marker)[0].trim();
    const details = [];
    if (category.value === 'land_plot') {
      details.push(`Plot size: ${field('plotSize').value} ${field('plotSizeUnit').value}`);
      if (field('landUse').value.trim()) details.push(`Land use: ${field('landUse').value.trim()}`);
    } else if (category.value === 'commercial') {
      details.push(`Floor area: ${field('floorArea').value} square metres`);
      details.push(`Commercial use: ${field('commercialUse').selectedOptions[0]?.textContent}`);
    }
    field('description').value = details.length ? `${description}${marker}${details.join('\n')}` : description;
    field('rentalMode').value = isLease() ? 'long_term' : field('rentalMode').value;
  };

  category.addEventListener('change', updateCategory);
  field('rentalMode').addEventListener('change', updatePriceFields);
  next.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    showStep(Math.min(currentStep + 1, steps.length - 1));
  });
  back.addEventListener('click', () => showStep(Math.max(currentStep - 1, 0)));
  form.addEventListener('submit', event => {
    if (currentStep !== steps.length - 1 || !validateStep(4)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    storeCategoryDetails();
  }, true);

  updateCategory();
  showStep(0);
})();