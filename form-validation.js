const validationMessages = new WeakMap();
let validationMessageId = 0;

function fieldValidationMessage(field) {
  if (!field.willValidate) return '';
  const validity = field.validity;
  if (validity.valueMissing) return 'This field is required.';
  if (validity.typeMismatch && field.type === 'email') return 'Enter an email address like name@example.com.';
  if (validity.typeMismatch && field.type === 'url') return 'Enter a complete web address.';
  if (validity.tooShort) return `Enter at least ${field.minLength} characters.`;
  if (validity.tooLong) return `Use no more than ${field.maxLength} characters.`;
  if (validity.rangeUnderflow) return `Enter a value of at least ${field.min}.`;
  if (validity.rangeOverflow) return `Enter a value no greater than ${field.max}.`;
  if (validity.stepMismatch) return 'Enter a valid number for this field.';
  if (validity.patternMismatch) return field.dataset.validationMessage || 'Check the format and try again.';
  if (!validity.valid) return 'Check this value and try again.';
  if (field.name === 'confirmPassword') {
    const password = field.form?.elements.namedItem('password');
    if (password?.value && field.value && password.value !== field.value) return 'Passwords do not match.';
  }
  return '';
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
  prepareForms(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node instanceof HTMLElement) prepareForms(node);
  }))).observe(document.body, { childList: true, subtree: true });

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
    if (field.name === 'password') {
      const confirmation = field.form.elements.namedItem('confirmPassword');
      if (confirmation?.dataset.validationTouched === 'true') updateFieldValidation(confirmation);
    }
  }, true);

  document.addEventListener('change', event => {
    const field = event.target;
    if (field instanceof HTMLElement && field.form && (field.dataset.validationTouched === 'true' || field.form.dataset.validationAttempted === 'true')) updateFieldValidation(field);
  }, true);

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
