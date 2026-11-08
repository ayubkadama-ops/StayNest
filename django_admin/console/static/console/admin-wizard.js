(() => {
  const form = document.getElementById('adminWizard');
  if (!form) return;

  const panels = Array.from(form.querySelectorAll('[data-step-panel]'));
  const steps = Array.from(document.querySelectorAll('.progress li'));
  const formStep = form.elements.formStep;
  let current = 0;
  const showStep = (index) => {
    current = index;
    formStep.value = String(index);
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.disabled = panelIndex !== index;
    });
    steps.forEach((step, stepIndex) => {
      if (stepIndex === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  };
  form.querySelectorAll('.next').forEach(button => button.addEventListener('click', () => {
    const panel = panels[current];
    if (!panel.reportValidity()) return;
    showStep(Math.min(current + 1, panels.length - 1));
  }));
  form.querySelectorAll('.back').forEach(button => button.addEventListener('click', () => showStep(Math.max(current - 1, 0))));
  form.addEventListener('submit', event => {
    const password = form.elements.password;
    const confirmation = form.elements.confirmPassword;
    if (password.value === confirmation.value) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    form.dataset.validationAttempted = 'true';
    showStep(1);
    confirmation.dataset.validationTouched = 'true';
    confirmation.setCustomValidity('Passwords do not match.');
    confirmation.reportValidity();
    confirmation.setCustomValidity('');
  });
  form.addEventListener('submit', () => panels.forEach(panel => {
    panel.disabled = false;
    panel.hidden = false;
  }));
  showStep(Math.max(0, Math.min(Number(formStep.value) || 0, panels.length - 1)));
})();
