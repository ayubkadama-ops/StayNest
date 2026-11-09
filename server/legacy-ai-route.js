const legacyAiRoute = /^\/(?:ai|makazi-go-ai)(?:\/.*)?$/i;
const legacyAiAlias = /^\/(?:ai|makazi-go-ai)\/?$/i;

export function resolveLegacyAiRoute(method, pathname) {
  if (!legacyAiRoute.test(pathname)) return null;

  if (legacyAiAlias.test(pathname) && ['GET', 'HEAD'].includes(method.toUpperCase())) {
    return { status: 302, location: '/?feature=makazi-go-ai#explore' };
  }

  if (legacyAiAlias.test(pathname)) {
    return {
      status: 405,
      allow: 'GET, HEAD',
      error: 'Makazi Go AI recommendations are not available yet.',
    };
  }

  return { status: 404, error: 'Makazi Go AI route not found.' };
}
