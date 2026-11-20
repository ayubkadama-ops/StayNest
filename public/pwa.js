if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(error => {
    console.warn('Makazi Go offline support is unavailable', error);
  });
}

const installTarget = document.querySelector('.header-actions') || document.querySelector('.topbar');
if (installTarget) {
  let installPrompt;
  const installButton = document.createElement('button');
  installButton.className = 'primary small pwa-install';
  installButton.type = 'button';
  installButton.textContent = 'Install app';
  installButton.setAttribute('aria-label', 'Install Makazi Go');
  installButton.hidden = true;
  installButton.style.display = 'none';
  installTarget.append(installButton);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
    installButton.style.display = '';
  });

  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    installButton.hidden = true;
    installButton.style.display = 'none';
    await prompt.prompt();
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;
    installButton.style.display = 'none';
  });
}
