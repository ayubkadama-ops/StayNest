import assert from 'node:assert/strict';
import test from 'node:test';
import { applyImageFallback, installImageFallbacks } from '../image-fallback.js';

test('image errors replace broken media once with a local fallback', () => {
  const image = {
    tagName: 'IMG',
    dataset: { imageFallback: '/assets/fallback.webp' },
    src: '/media/missing.webp',
    hidden: false
  };

  assert.equal(applyImageFallback(image), true);
  assert.equal(image.src, '/assets/fallback.webp');
  assert.equal(applyImageFallback(image), false);
  assert.equal(image.src, '/assets/fallback.webp');
});

test('image errors can hide images without a fallback and ignore other elements', () => {
  const image = { tagName: 'IMG', dataset: { hideOnImageError: 'true' }, hidden: false };
  assert.equal(applyImageFallback(image), true);
  assert.equal(image.hidden, true);
  assert.equal(applyImageFallback({ tagName: 'VIDEO', dataset: {} }), false);
});

test('image fallback installation uses a capturing listener only once per document', () => {
  const listeners = [];
  const document = { addEventListener: (...args) => listeners.push(args) };
  installImageFallbacks(document);
  installImageFallbacks(document);

  assert.equal(listeners.length, 1);
  assert.equal(listeners[0][0], 'error');
  assert.equal(listeners[0][2], true);
});
