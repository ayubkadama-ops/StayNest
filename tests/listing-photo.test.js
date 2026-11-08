import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareListingPhoto } from '../listing-photo.js';

function replaceGlobals(t, replacements) {
  const originals = new Map(
    Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}

test('a browser decode failure leaves the supported original for server-side validation', async t => {
  let revoked = '';
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:test-photo';
  URL.revokeObjectURL = url => { revoked = url; };
  t.after(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
  replaceGlobals(t, {
    createImageBitmap: async () => { throw new Error('Unsupported codec'); },
    Image: class {
      set src(value) { this.source = value; }
      async decode() { throw new Error('Unsupported codec'); }
    }
  });
  const original = new File(['webp-photo-data'], 'listing.webp', { type: 'image/webp' });

  assert.equal(await prepareListingPhoto(original), original);
  assert.equal(revoked, 'blob:test-photo');
});

test('compressed image filenames and MIME types match the actual canvas blob', async t => {
  let bitmapClosed = false;
  let requestedType = '';
  replaceGlobals(t, {
    createImageBitmap: async () => ({
      width: 3000,
      height: 2000,
      close() { bitmapClosed = true; }
    }),
    document: {
      createElement: () => ({
        getContext: () => ({ drawImage() {} }),
        toBlob(callback, type) {
          requestedType = type;
          callback(new Blob(['compressed-photo'], { type: 'image/png' }));
        }
      })
    }
  });
  const original = new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'listing.webp', {
    type: 'image/webp',
    lastModified: 123
  });

  const prepared = await prepareListingPhoto(original);

  assert.equal(prepared.name, 'listing.png');
  assert.equal(prepared.type, 'image/png');
  assert.equal(prepared.lastModified, 123);
  assert.equal(requestedType, 'image/webp');
  assert.equal(bitmapClosed, true);
});
