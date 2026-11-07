const validationMessages = new WeakMap();
let validationMessageId = 0;

function isPasswordConfirmation(field) {
  const name = field.name.toLowerCase().replace(/[-_]/g, '');
  return name === 'confirmpassword' || name === 'confirmnewpassword' || field.matches('[data-confirm-password]');
}

function fieldValidationMessage(field) {
  if (!field.willValidate) return '';
  const validity = field.validity;
  if (validity.customError) return field.validationMessage || 'Check this value and try again.';
  if (validity.valueMissing) return 'This field is required.';
  if (field.required && field.type !== 'password' && typeof field.value === 'string' && !field.value.trim()) return 'This field is required.';
  if (validity.typeMismatch && field.type === 'email') return 'Enter an email address like name@example.com.';
  if (validity.typeMismatch && field.type === 'url') return 'Enter a complete web address.';
  if (validity.tooShort) return `Enter at least ${field.minLength} characters.`;
  if (validity.tooLong) return `Use no more than ${field.maxLength} characters.`;
  if (validity.rangeUnderflow) return `Enter a value of at least ${field.min}.`;
  if (validity.rangeOverflow) return `Enter a value no greater than ${field.max}.`;
  if (validity.stepMismatch) return 'Enter a valid number for this field.';
  if (validity.patternMismatch) return field.dataset.validationMessage || 'Check the format and try again.';
  if (!validity.valid) return 'Check this value and try again.';
  if (field.dataset.validationRule === 'strong-password' && field.value) {
    const characterTypes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(pattern => pattern.test(field.value)).length;
    if (field.value.length < 12 || field.value.length > 200 || characterTypes < 3) {
      return 'Use at least 12 characters with at least three character types.';
    }
  }
  if (field.dataset.validationRule === 'founder-profile-image' && field.value) {
    const localImage = field.value.startsWith('/assets/') && !field.value.split('/').includes('..');
    let secureImage = false;
    try {
      const url = new URL(field.value);
      secureImage = url.protocol === 'https:' && Boolean(url.hostname);
    } catch {}
    if (!localImage && !secureImage) return 'Use a secure HTTPS image URL or a local /assets/ path.';
  }
  if (field.dataset.validationRule === 'ip-network' && field.value && !validIpNetwork(field.value)) {
    return 'Enter a valid IP address or CIDR range.';
  }
  const shouldCheckPasswordMatch = field.form?.dataset.passwordMatchOnSubmit !== 'true'
    || field.form.dataset.validationAttempted === 'true';
  if (shouldCheckPasswordMatch && isPasswordConfirmation(field)) {
    const password = [...(field.form?.querySelectorAll('input[type="password"]') || [])]
      .find(candidate => candidate !== field && /^(new[_-]?)?password$/i.test(candidate.name));
    if (password && (password.value || field.value) && password.value !== field.value) return 'Passwords do not match.';
  }
  return '';
}

function validIpNetwork(value) {
  const [address, prefix, ...extra] = value.split('/');
  if (!address || extra.length) return false;
  const parsedPrefix = prefix === undefined ? null : Number(prefix);
  if (prefix !== undefined && (!/^\d+$/.test(prefix) || !Number.isInteger(parsedPrefix))) return false;
  if (address.includes(':')) {
    if (parsedPrefix !== null && (parsedPrefix < 0 || parsedPrefix > 128)) return false;
    try {
      return new URL(`http://[${address}]`).hostname.length > 0;
    } catch {
      return false;
    }
  }
  if (parsedPrefix !== null && (parsedPrefix < 0 || parsedPrefix > 32)) return false;
  const octets = address.split('.');
  return octets.length === 4 && octets.every(octet => /^(?:0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255);
}

function updateFieldValidation(field, force = false) {
  if (!(field instanceof HTMLElement) || !('willValidate' in field)) return true;
  const show = force || field.dataset.validationTouched === 'true' || field.form?.dataset.validationAttempted === 'true';
  const message = show ? fieldValidationMessage(field) : '';
  let messageNode = validationMessages.get(field);
  if (message && !messageNode) {
    messageNode = document.createElement('small');
    messageNode.className = 'field-validation-message';
    messageNode.id = `field-validation-${++validationMessageId}`;
    messageNode.setAttribute('role', 'alert');
    field.insertAdjacentElement('afterend', messageNode);
    validationMessages.set(field, messageNode);
  }
  if (messageNode) {
    messageNode.textContent = message;
    if (!message) {
      messageNode.remove();
      validationMessages.delete(field);
    }
  }
  field.classList.toggle('is-invalid', Boolean(message));
  if (message) {
    field.setAttribute('aria-invalid', 'true');
    const describedBy = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    describedBy.add(messageNode.id);
    field.setAttribute('aria-describedby', [...describedBy].join(' '));
  } else {
    field.removeAttribute('aria-invalid');
    const describedBy = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== messageNode?.id);
    if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
    else field.removeAttribute('aria-describedby');
  }
  return !message;
}

function prepareForms(root) {
  if (root instanceof HTMLFormElement) root.noValidate = true;
  root.querySelectorAll?.('form').forEach(form => { form.noValidate = true; });
}

export function installLiveFormValidation() {
  if (document.documentElement.dataset.liveFormValidation === 'true') return;
  document.documentElement.dataset.liveFormValidation = 'true';
  prepareForms(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node instanceof HTMLElement) prepareForms(node);
  }))).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('invalid', event => {
    const field = event.target;
    if (field instanceof HTMLElement && field.form) {
      event.preventDefault();
      updateFieldValidation(field, true);
    }
  }, true);

  document.addEventListener('focusout', event => {
    const field = event.target;
    if (!(field instanceof HTMLElement) || !field.form) return;
    field.dataset.validationTouched = 'true';
    updateFieldValidation(field);
  }, true);

  document.addEventListener('input', event => {
    const field = event.target;
    if (!(field instanceof HTMLElement) || !field.form) return;
    if (field.dataset.validationTouched === 'true' || field.form.dataset.validationAttempted === 'true') updateFieldValidation(field);
    if (field.type === 'password') {
      const confirmation = [...field.form.querySelectorAll('input[type="password"]')]
        .find(isPasswordConfirmation);
      if (confirmation?.dataset.validationTouched === 'true' || field.form.dataset.validationAttempted === 'true') {
        updateFieldValidation(confirmation);
      }
    }
  });

  document.addEventListener('change', event => {
    const field = event.target;
    if (field instanceof HTMLElement && field.form && (field.dataset.validationTouched === 'true' || field.form.dataset.validationAttempted === 'true')) updateFieldValidation(field);
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    form.dataset.validationAttempted = 'true';
    const fields = [...form.elements].filter(field => field instanceof HTMLElement && 'willValidate' in field);
    const valid = fields.map(field => updateFieldValidation(field, true)).every(Boolean);
    if (!valid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      fields.find(field => field.matches('[aria-invalid="true"]'))?.focus();
      return;
    }
    delete form.dataset.validationAttempted;
  }, true);
}

installLiveFormValidation();
