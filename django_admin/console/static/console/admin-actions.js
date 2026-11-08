document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.confirm && !window.confirm(button.dataset.confirm)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (button.dataset.permissionSelection === 'all') {
    document.querySelectorAll('input[name="permissions"]').forEach(input => {
      input.checked = true;
    });
  } else if (button.dataset.permissionSelection === 'none') {
    document.querySelectorAll('input[name="permissions"]').forEach(input => {
      input.checked = false;
    });
  }
});
