import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const appConfigFactory = require('../mobile/app.config.js');
const baseConfig = require('../mobile/app.json').expo;
const environmentKeys = [
  'APP_VARIANT',
  'EXPO_PUBLIC_API_URL',
  'IOS_BUNDLE_IDENTIFIER',
  'ANDROID_PACKAGE',
];

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  for (const key of environmentKeys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    return callback();
  } finally {
    for (const key of environmentKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

function loadConfig(values = {}) {
  return withEnvironment(values, () => appConfigFactory({ config: baseConfig }));
}

test('development app config uses isolated identifiers and allows local API origins', () => {
  const config = loadConfig({
    EXPO_PUBLIC_API_URL: 'http://10.0.2.2:3000/',
  });
  assert.equal(config.ios.bundleIdentifier, 'com.makazigo.mobile.development');
  assert.equal(config.android.package, 'com.makazigo.mobile.development');
  assert.equal(config.scheme, 'makazigo-development');
  assert.equal(config.extra.apiOrigin, 'http://10.0.2.2:3000');
});

test('production app config requires HTTPS and owner-supplied native identifiers', () => {
  const config = loadConfig({
    APP_VARIANT: 'production',
    EXPO_PUBLIC_API_URL: 'https://api.example.test',
    IOS_BUNDLE_IDENTIFIER: 'org.example.makazigo',
    ANDROID_PACKAGE: 'org.example.makazigo',
  });
  assert.equal(config.ios.bundleIdentifier, 'org.example.makazigo');
  assert.equal(config.android.package, 'org.example.makazigo');
  assert.equal(config.scheme, 'makazigo');
  assert.equal(config.extra.appVariant, 'production');
});

test('release app config rejects missing API origin, HTTP, and malformed native identifiers', () => {
  assert.throws(() => loadConfig({ APP_VARIANT: 'production' }), /require EXPO_PUBLIC_API_URL/);
  assert.throws(() => loadConfig({
    APP_VARIANT: 'production',
    EXPO_PUBLIC_API_URL: 'https://api.example.test',
    ANDROID_PACKAGE: 'org.example.makazigo',
  }), /require IOS_BUNDLE_IDENTIFIER/);
  assert.throws(() => loadConfig({
    APP_VARIANT: 'preview',
    EXPO_PUBLIC_API_URL: 'http://api.example.test',
  }), /require an HTTPS API origin/);
  assert.throws(() => loadConfig({
    APP_VARIANT: 'production',
    EXPO_PUBLIC_API_URL: 'https://api.example.test',
    IOS_BUNDLE_IDENTIFIER: 'org.example.makazigo',
    ANDROID_PACKAGE: 'invalid package',
  }), /ANDROID_PACKAGE is not a valid/);
});

test('API configuration rejects non-origin paths and embedded credentials', () => {
  assert.throws(() => loadConfig({
    EXPO_PUBLIC_API_URL: 'http://localhost:3000/api',
  }), /must be an HTTP\(S\) origin/);
  assert.throws(() => loadConfig({
    EXPO_PUBLIC_API_URL: 'https://user:password@example.test',
  }), /must be an HTTP\(S\) origin/);
});

test('profile photo selection requests photo-library access without camera or microphone access', () => {
  const imagePickerPlugin = baseConfig.plugins.find(
    plugin => Array.isArray(plugin) && plugin[0] === 'expo-image-picker',
  );
  assert.ok(imagePickerPlugin);
  assert.match(imagePickerPlugin[1].photosPermission, /profile picture/);
  assert.equal(imagePickerPlugin[1].cameraPermission, false);
  assert.equal(imagePickerPlugin[1].microphonePermission, false);
});
