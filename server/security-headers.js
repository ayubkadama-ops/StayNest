export const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", 'https://www.openstreetmap.org'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.tile.openstreetmap.org'],
      mediaSrc: ["'self'", 'blob:', 'https://res.cloudinary.com'],
      scriptSrc: ["'self'", 'https://www.googletagmanager.com'],
      connectSrc: ["'self'", 'https://www.google-analytics.com', 'https://analytics.google.com', 'https://region1.google-analytics.com'],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:']
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};
