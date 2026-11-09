const appConfig = require('./app.json').expo;

const appVariants = new Set(['development', 'preview', 'production']);
const iosBundleIdPattern = /^(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z0-9][A-Za-z0-9-]*$/;
const androidPackagePattern = /^(?:[A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/;

function configuredApiOrigin(variant) {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) {
    if (variant !== 'development') {
      throw new Error(`${variant} builds require EXPO_PUBLIC_API_URL.`);
    }
    return undefined;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL must be an HTTP(S) origin without a path, query, or fragment.');
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.hostname.includes(';') ||
    url.hostname.includes(',') ||
    url.username ||
    url.password ||
    (url.pathname !== '' && url.pathname !== '/') ||
    url.search ||
    url.hash
  ) {
    throw new Error('EXPO_PUBLIC_API_URL must be an HTTP(S) origin without a path, query, or fragment.');
  }
  if (variant !== 'development' && url.protocol !== 'https:') {
    throw new Error(`${variant} builds require an HTTPS API origin.`);
  }
  return url.origin;
}

function configuredIdentifier(value, envName, pattern, variant, developmentFallback) {
  const identifier = value?.trim() || (variant === 'production' ? '' : developmentFallback);
  if (!identifier) {
    throw new Error(`${variant} builds require ${envName}; use the identifier registered to the app owner.`);
  }
  if (!pattern.test(identifier)) {
    throw new Error(`${envName} is not a valid native application identifier.`);
  }
  return identifier;
}

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT?.trim() || 'development';
  if (!appVariants.has(variant)) {
    throw new Error('APP_VARIANT must be development, preview, or production.');
  }

  const apiOrigin = configuredApiOrigin(variant);
  const iosBundleIdentifier = configuredIdentifier(
    process.env.IOS_BUNDLE_IDENTIFIER,
    'IOS_BUNDLE_IDENTIFIER',
    iosBundleIdPattern,
    variant,
    `com.makazigo.mobile.${variant}`,
  );
  const androidPackage = configuredIdentifier(
    process.env.ANDROID_PACKAGE,
    'ANDROID_PACKAGE',
    androidPackagePattern,
    variant,
    `com.makazigo.mobile.${variant}`,
  );

  return {
    ...config,
    name: variant === 'preview' ? `${appConfig.name} Preview` : appConfig.name,
    scheme: variant === 'production' ? appConfig.scheme : `${appConfig.scheme}-${variant}`,
    ios: {
      ...config.ios,
      bundleIdentifier: iosBundleIdentifier,
    },
    android: {
      ...config.android,
      package: androidPackage,
    },
    extra: {
      ...config.extra,
      appVariant: variant,
      ...(apiOrigin ? { apiOrigin } : {}),
    },
  };
};
