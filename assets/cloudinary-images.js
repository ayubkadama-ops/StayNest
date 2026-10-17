(() => {
  const cloudName = 's9p5ymwd';
  let activeCloudName = cloudName;
  let enabled = false;

  const cloudinaryAssetUrl = source => {
    if (!enabled) return source;
    const match = String(source || '').match(/^\/?assets\/(.+)\.(avif|jpe?g|png|svg|webp)(?:[?#].*)?$/i);
    if (!match || match[1].split('/').some(part => !part || part === '.' || part === '..')) return source;
    const publicId = match[1].replace(/\.[^.]+$/, '');
    return `https://res.cloudinary.com/${activeCloudName}/image/upload/f_auto,q_auto/site-assets/${publicId}`;
  };

  const rewrite = root => {
    root.querySelectorAll?.('img[src], link[rel~="icon"][href]').forEach(element => {
      const attribute = element.tagName === 'IMG' ? 'src' : 'href';
      const source = element.getAttribute(attribute);
      const optimized = cloudinaryAssetUrl(source);
      if (optimized !== source) element.setAttribute(attribute, optimized);
    });
  };

  window.cloudinaryAssetUrl = cloudinaryAssetUrl;
  window.enableCloudinaryAssets = configuredCloudName => {
    if (enabled) return;
    if (configuredCloudName) activeCloudName = configuredCloudName;
    enabled = true;
    rewrite(document);

    const hero = cloudinaryAssetUrl('/assets/makazi-go-hero.webp');
    const family = cloudinaryAssetUrl('/assets/makazi-go-family.webp');
    const frameRules = [32, 84, 156, 220].map((frame, index) =>
      `.listing-card:nth-child(${index + 1}) .listing-photo{background-image:url("${cloudinaryAssetUrl(`/assets/ezgif-frame-${String(frame).padStart(3, '0')}.jpg`)}")!important}`
    ).join('');
    const style = document.createElement('style');
    const logo = cloudinaryAssetUrl('/assets/makazi-go-icon.png');
    style.textContent = `.hero-image{background-image:linear-gradient(90deg,rgba(6,43,34,.12),transparent),url("${hero}")!important}.auth-intro{background-image:linear-gradient(180deg,rgba(6,43,34,.12),rgba(6,43,34,.92)),url("${hero}")!important}.split-image{background-image:url("${family}")!important}.brand-mark{background-image:url("${logo}")!important}${frameRules}`;
    document.head.append(style);

    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'attributes') rewrite(record.target.parentElement || document);
      else record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) rewrite(node);
      });
    })).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'href']
    });
  };

  window.cloudinaryConfigReady = fetch('/api/public-config', { credentials: 'same-origin', cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Public config request failed (${response.status})`);
      return response.json();
    })
    .then(config => {
      if (config.cloudinaryAssetsEnabled) window.enableCloudinaryAssets(config.cloudinaryCloudName);
      return config;
    })
    .catch(error => {
      console.warn('Cloudinary image delivery configuration unavailable:', error.message);
      return {};
    });
})();