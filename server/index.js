import 'dotenv/config';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { generateSecret, generateURI, verify } from 'otplib';
import { pool, assertDatabaseConnection } from './db.js';
import { MySqlSessionStore, ensureSessionTable } from './session-store.js';
import { decryptSecret, encryptSecret } from './crypto.js';
import { storeAgentProfileImage, storeListingImage, storeListingVideo, storePrivateDocument, storeUserProfileImage, validateUpload } from './storage.js';
import { verifyWebhookSignature, calculateBooking, hasRole } from './rules.js';
import { boundedPage, isValidDate, nonEmptyString, positiveId } from './validation.js';
import { geocodeAddress } from './geocoding.js';
import { notifyUser } from './notifications.js';
import { getGa4Analytics } from './google-analytics.js';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.APP_ENCRYPTION_KEY || process.env.APP_ENCRYPTION_KEY.length < 16) {
  throw new Error('SESSION_SECRET and APP_ENCRYPTION_KEY must be configured');
}

const app = express();
app.disable('x-powered-by');
const DEFAULT_PROFILE_AVATAR = '/assets/default-avatar.svg';
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use((req, res, next) => {
  const requestId = req.get('x-request-id')?.match(/^[A-Za-z0-9._-]{8,100}$/)?.[0] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});
app.use('/media', express.static(path.resolve(process.cwd(), 'storage', 'media'), {
  fallthrough: false,
  index: false,
  maxAge: '1y',
  immutable: true
}));
app.use('/vendor', express.static(path.resolve(process.cwd(), 'node_modules', 'leaflet', 'dist'), {
  fallthrough: false,
  index: false,
  maxAge: '1d'
}));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype))
});
const agentListingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 11 },
  fileFilter: (_req, file, cb) => cb(null, file.fieldname === 'document'
    ? ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)
    : ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'].includes(file.mimetype))
});
const sessionStore = new MySqlSessionStore();
const googleOAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';
const approvalContact = {
  email: 'cleysir54@gmail.com',
  whatsapp: '255794442907',
  displayPhone: '0794 442 907'
};
const PASSWORD_RESET_TTL_MINUTES = 30;
let runtimeConfig = {
  siteName: 'StayNest',
  siteLogoUrl: '',
  contactEmail: 'cleysir54@gmail.com',
  contactPhone: '0794 442 907',
  timezone: 'Africa/Dar_es_Salaam',
  maintenanceMode: false,
  maintenanceMessage: 'StayNest is being updated. Please check back shortly.'
};
const adminSettingKeys = {
  site_name: 'siteName',
  site_logo_url: 'siteLogoUrl',
  contact_email: 'contactEmail',
  contact_phone: 'contactPhone',
  timezone: 'timezone',
  maintenance_mode: 'maintenanceMode',
  maintenance_message: 'maintenanceMessage'
};
async function loadRuntimeConfig() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM app_settings');
  for (const row of rows) {
    const key = adminSettingKeys[row.setting_key];
    if (!key) continue;
    runtimeConfig[key] = row.setting_key === 'maintenance_mode' ? row.setting_value === '1' : row.setting_value;
  }
}
async function isFeatureEnabled(featureKey) {
  const [[feature]] = await pool.query('SELECT enabled FROM feature_flags WHERE feature_key=?', [featureKey]);
  return feature ? Boolean(feature.enabled) : true;
}
const strongPassword = password => typeof password === 'string'
  && password.length >= 12
  && password.length <= 200
  && [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(pattern => pattern.test(password)).length >= 3;
const hashResetToken = token => crypto.createHash('sha256').update(token).digest();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", 'https://www.openstreetmap.org'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
      connectSrc: ["'self'", 'https://www.google-analytics.com', 'https://analytics.google.com', 'https://region1.google-analytics.com'],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:']
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res, next) => {
  try {
    const signature = req.get('x-payment-signature') || '';
    if (!verifyWebhookSignature(req.body, signature, process.env.PAYMENT_WEBHOOK_SECRET)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    const event = JSON.parse(req.body.toString('utf8'));
    if (!event.id || !event.paymentId || !event.bookingId || !event.status) return res.status(400).json({ error: 'Invalid webhook payload' });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [existing] = await connection.execute('SELECT id FROM payments WHERE raw_event_id=? FOR UPDATE', [event.id]);
      if (!existing.length) {
        await connection.execute(
          'INSERT INTO payments (booking_id, provider, provider_payment_id, amount, currency, status, paid_at, raw_event_id) VALUES (?, ?, ?, ?, ?, ?, IF(?="succeeded", UTC_TIMESTAMP(), NULL), ?)',
          [event.bookingId, event.provider || 'provider', event.paymentId, event.amount || 0, event.currency || 'USD', event.status, event.status, event.id]
        );
        if (event.status === 'succeeded') await connection.execute('UPDATE bookings SET payment_status="paid", status="confirmed", confirmed_at=UTC_TIMESTAMP() WHERE id=?', [event.bookingId]);
        if (event.status === 'failed') await connection.execute('UPDATE bookings SET payment_status="failed", status="cancelled" WHERE id=? AND status="payment_pending"', [event.bookingId]);
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    res.status(204).end();
  } catch (error) { next(error); }
});
app.use(express.json({ limit: '100kb' }));
app.use(session({
  name: 'staynest.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: process.env.TRUST_PROXY === 'true',
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(async (req, res, next) => {
  if (!runtimeConfig.maintenanceMode || req.path.startsWith('/api/auth') || req.path === '/api/health' || req.path === '/api/ready' || req.path.startsWith('/api/admin') || req.path === '/admin' || req.path === '/admin.html') return next();
  if (req.session.user?.roles?.includes('administrator')) return next();
  if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) return res.status(503).send(`<!doctype html><title>${runtimeConfig.siteName}</title><h1>${runtimeConfig.siteName} is temporarily unavailable</h1><p>${runtimeConfig.maintenanceMessage}</p>`);
  if (req.path.startsWith('/api/')) return res.status(503).json({ error: runtimeConfig.maintenanceMessage, maintenance: true });
  next();
});
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skip: req => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'staynest-api' }));
app.get('/api/public-config', (_req, res) => res.json({
  siteName: runtimeConfig.siteName,
  siteLogoUrl: runtimeConfig.siteLogoUrl,
  contactEmail: runtimeConfig.contactEmail,
  contactPhone: runtimeConfig.contactPhone,
  timezone: runtimeConfig.timezone,
  maintenanceMode: runtimeConfig.maintenanceMode,
  maintenanceMessage: runtimeConfig.maintenanceMessage
}));
app.get('/api/ready', async (_req, res) => {
  try {
    await assertDatabaseConnection();
    res.json({ ok: true, service: 'staynest-api', database: 'ok' });
  } catch {
    res.status(503).json({ ok: false, service: 'staynest-api', database: 'unavailable' });
  }
});

app.get('/api/auth/csrf', (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ token: req.session.csrfToken });
});

app.get('/api/auth/google', (req, res) => {
  if (!googleOAuthEnabled) return res.status(503).send('Google sign-in is not configured yet.');
  const state = crypto.randomBytes(32).toString('hex');
  req.session.googleOAuthState = state;
  const query = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleCallbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${query}`);
});

app.get('/api/auth/google/callback', async (req, res, next) => {
  const redirectError = (message) => res.redirect(`/index.html?authError=${encodeURIComponent(message)}`);
  try {
    if (!googleOAuthEnabled) return redirectError('Google sign-in is not configured.');
    const { code, state, error } = req.query;
    if (error) return redirectError('Google sign-in was cancelled.');
    const expectedState = typeof req.session.googleOAuthState === 'string' ? req.session.googleOAuthState : '';
    const stateBuffer = Buffer.from(state || '');
    const expectedStateBuffer = Buffer.from(expectedState);
    if (typeof code !== 'string' || typeof state !== 'string' || stateBuffer.length !== expectedStateBuffer.length || !crypto.timingSafeEqual(stateBuffer, expectedStateBuffer)) {
      return res.status(400).send('Invalid Google sign-in state.');
    }
    delete req.session.googleOAuthState;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleCallbackUrl,
        grant_type: 'authorization_code'
      })
    });
    if (!tokenResponse.ok) return redirectError('Google sign-in could not be completed.');
    const token = await tokenResponse.json();
    if (!token.access_token) return redirectError('Google did not return a valid sign-in token.');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!profileResponse.ok) return redirectError('Google profile information could not be verified.');
    const profile = await profileResponse.json();
    const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
    const googleId = typeof profile.sub === 'string' ? profile.sub.trim() : '';
    if (!googleId || !email || profile.email_verified !== true) return redirectError('Google must provide a verified email address.');
    const firstName = String(profile.given_name || profile.name || 'StayNest').trim().slice(0, 80) || 'StayNest';
    const lastName = String(profile.family_name || 'Member').trim().slice(0, 80) || 'Member';
    const avatarUrl = typeof profile.picture === 'string' && /^https:\/\//i.test(profile.picture) ? profile.picture.slice(0, 2048) : DEFAULT_PROFILE_AVATAR;
    const connection = await pool.getConnection();
    let user;
    try {
      await connection.beginTransaction();
      const [matches] = await connection.execute(
        `SELECT u.id, u.email, u.status, p.first_name firstName, p.last_name lastName
         FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id
         WHERE u.google_id=? OR u.email=? LIMIT 1 FOR UPDATE`,
        [googleId, email]
      );
      user = matches[0];
      if (user?.status === 'suspended' || user?.status === 'deleted') {
        await connection.rollback();
        return redirectError('This StayNest account is not active.');
      }
      if (user?.status === 'pending') {
        await connection.rollback();
        return redirectError('This StayNest account is awaiting approval.');
      }
        if (!user) {
          await connection.rollback();
          req.session.googlePending = { email, googleId, firstName, lastName, avatarUrl };
          return res.redirect('/index.html?auth=google-setup');
        } else {
        await connection.execute(
          'UPDATE users SET google_id=COALESCE(google_id, ?), email_verified_at=COALESCE(email_verified_at, UTC_TIMESTAMP()), last_login_at=UTC_TIMESTAMP() WHERE id=?',
          [googleId, user.id]
        );
        await connection.execute(
          'UPDATE user_profiles SET avatar_url=COALESCE(avatar_url, ?), first_name=COALESCE(NULLIF(first_name, ""), ?), last_name=COALESCE(NULLIF(last_name, ""), ?) WHERE user_id=?',
          [avatarUrl, firstName, lastName, user.id]
        );
      }
      await connection.execute('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=?', [user.id]);
      const [roleRows] = await connection.execute(
        'SELECT r.name FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=?',
        [user.id]
      );
      const roles = roleRows.map(row => row.name).filter(role => ['tenant', 'agent', 'administrator'].includes(role));
      if (!roles.length) {
        await connection.execute('INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE name="tenant"', [user.id]);
        roles.push('tenant');
      }
      await connection.commit();
      await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.cookie.maxAge = 1000 * 60 * 60 * 8;
      req.session.user = { id: user.id, firstName: user.firstName || firstName, lastName: user.lastName || lastName, roles };
      return res.redirect('/index.html?auth=google');
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return redirectError('This Google account is already linked to another StayNest account.');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) { next(error); }
});

app.post('/api/auth/google/complete', async (req, res, next) => {
  const pending = req.session.googlePending;
  if (!pending) return res.status(400).json({ error: 'Your Google sign-in session expired. Please try again.' });
  const phone = String(req.body.phone || '').trim();
  const location = String(req.body.location || '').trim();
  const role = String(req.body.role || '');
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';
  if (!/^\+?[0-9][0-9\s().-]{6,24}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
  if (!location || location.length > 100) return res.status(400).json({ error: 'Enter your city or location.' });
  if (!['tenant', 'agent'].includes(role)) return res.status(400).json({ error: 'Choose Tenant or Agent.' });
  if (!strongPassword(password)) return res.status(400).json({ error: 'Choose a strong password with at least 12 characters, including three character types.' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT id FROM users WHERE google_id=? OR email=? OR phone=? LIMIT 1 FOR UPDATE', [pending.googleId, pending.email, phone]);
    if (existing.length) {
      await connection.rollback();
      delete req.session.googlePending;
      return res.status(409).json({ error: 'This Google account or phone number is already registered. Try signing in instead.' });
    }
    const status = role === 'agent' ? 'pending' : 'active';
    const [result] = await connection.execute(
      'INSERT INTO users (email, phone, password_hash, google_id, status, email_verified_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())',
      [pending.email, phone, await bcrypt.hash(password, 12), pending.googleId, status]
    );
    await connection.execute(
      'INSERT INTO user_profiles (user_id, first_name, last_name, display_name, avatar_url, city) VALUES (?, ?, ?, ?, ?, ?)',
      [result.insertId, pending.firstName, pending.lastName, `${pending.firstName} ${pending.lastName}`.slice(0, 160), pending.avatarUrl || DEFAULT_PROFILE_AVATAR, location]
    );
    await connection.execute('INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE name=?', [result.insertId, role]);
    if (role === 'agent') await connection.execute('INSERT INTO agent_profiles (user_id) VALUES (?)', [result.insertId]);
    await connection.commit();
    delete req.session.googlePending;
    if (role === 'agent') {
      return res.status(201).json({ ok: true, pendingApproval: true, message: 'Your agent registration is pending founder approval.', approvalContact });
    }
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.cookie.maxAge = 1000 * 60 * 60 * 8;
    req.session.user = { id: result.insertId, firstName: pending.firstName, lastName: pending.lastName, roles: [role] };
    res.status(201).json({ ok: true, roles: [role] });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That email or phone number is already registered.' });
    next(error);
  } finally { connection.release(); }
});

const requireCsrf = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.originalUrl === '/api/auth/login' || req.originalUrl === '/api/auth/register' || req.originalUrl === '/api/auth/password-reset/request' || req.originalUrl === '/api/admin/gate') return next();
  // Listing view analytics is intentionally available to guests and does not change account state.
  if (req.method === 'POST' && /^\/listings\/\d+\/view$/.test(req.path)) return next();
  const supplied = req.get('x-csrf-token') || '';
  if (!req.session.csrfToken || supplied.length !== req.session.csrfToken.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(req.session.csrfToken))) return res.status(403).json({ error: 'Invalid CSRF token' });
  next();
};
app.use('/api', requireCsrf);

const requireAuth = async (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.session.adminGate === true && req.session.user.roles?.includes('administrator')) return next();
  // Re-check account state so a suspended or pending account cannot keep using
  // a session that was created before an administrator changed its status.
  if (req.session.user.id) {
    const [[account]] = await pool.query('SELECT status FROM users WHERE id=?', [req.session.user.id]);
    if (!account || account.status !== 'active') {
      req.session.destroy(() => {});
      return res.status(403).json({ error: account?.status === 'pending' ? 'Your account is awaiting founder approval' : 'Your account is not active' });
    }
  }
  next();
};
const requireRole = (role) => (req, res, next) =>
  hasRole(req.session.user?.roles, role) ? next() : res.status(403).json({ error: 'Insufficient permissions' });
async function adminIpAllowed(ip) {
  const [rules] = await pool.query('SELECT rule_type, cidr FROM admin_ip_rules WHERE enabled=TRUE');
  const normalized = String(ip || '').replace(/^::ffff:/, '');
  const matches = rule => rule === normalized || (rule.includes('/') && normalized.startsWith(rule.split('/')[0].split('.').slice(0, 3).join('.')));
  const denied = rules.some(rule => rule.rule_type === 'deny' && matches(rule.cidr));
  const allowRules = rules.filter(rule => rule.rule_type === 'allow');
  return !denied && (!allowRules.length || allowRules.some(rule => matches(rule.cidr)));
}
const requireAdminAccess = async (req, res, next) => {
  if (!(req.session.user?.roles?.includes('administrator') || req.session.adminGate === true)) return res.status(403).json({ error: 'Administrator access required' });
  if (!(await adminIpAllowed(req.ip))) return res.status(403).json({ error: 'This administrator network is not allowed' });
  next();
};
const adminGateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: req => req.path === '/health' || req.path === '/ready'
});
app.use('/api', apiLimiter);
const requireHostRole = (req, res, next) =>
  req.session.user?.roles?.includes('agent') ? next() : res.status(403).json({ error: 'Agent permissions required' });
const requireAgentAccess = (permission) => (req, res, next) => {
  if (!req.session.user?.roles?.includes('agent')) return res.status(403).json({ error: 'Agent permissions required' });
  if (!req.session.user.isSubAgent || req.session.user.permissions?.includes(permission)) return next();
  return res.status(403).json({ error: `Your sub-agent account is not allowed to perform: ${permission}` });
};
const SUB_AGENT_PERMISSIONS = [
  { key: 'listings.create', label: 'Create listings' },
  { key: 'listings.manage', label: 'Manage listings and location data' },
  { key: 'bookings.view', label: 'View booking requests' },
  { key: 'bookings.manage', label: 'Approve or decline bookings' },
  { key: 'messages.send', label: 'Send messages to tenants' },
  { key: 'media.manage', label: 'Manage listing media' },
  { key: 'identity.manage', label: 'Upload identity documents' },
  { key: 'profile.manage', label: 'Manage agent profile' }
];
const agentOwnerId = (req) => req.session.user?.isSubAgent ? req.session.user.mainAgentId : req.session.user?.id;
async function notifyAdministrators(notification) {
  const [admins] = await pool.query(
    `SELECT DISTINCT u.id FROM users u
     JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
     WHERE u.status="active" AND r.name="administrator"`
  );
  await Promise.all(admins.map(admin => notifyUser(admin.id, notification)));
}

app.post('/api/auth/register', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    if (!(await isFeatureEnabled('new_registrations'))) return res.status(503).json({ error: 'New registrations are temporarily paused' });
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const role = String(req.body.role || 'tenant');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !strongPassword(password)) return res.status(400).json({ error: 'Enter a valid email and a strong password with at least 12 characters, including three character types' });
    if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name are required' });
    if (!['tenant', 'agent'].includes(role)) return res.status(400).json({ error: 'Choose either Tenant or Agent' });
    await connection.beginTransaction();
    const initialStatus = role === 'agent' ? 'pending' : 'active';
    const [result] = await connection.execute('INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)', [email, await bcrypt.hash(password, 12), initialStatus]);
    await connection.execute('INSERT INTO user_profiles (user_id, first_name, last_name, avatar_url) VALUES (?, ?, ?, ?)', [result.insertId, firstName, lastName, DEFAULT_PROFILE_AVATAR]);
    await connection.execute('INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE name = ?', [result.insertId, role]);
    if (role === 'agent') await connection.execute('INSERT INTO agent_profiles (user_id) VALUES (?)', [result.insertId]);
    await connection.commit();
    if (role === 'agent') {
      void notifyAdministrators({
        type: 'agent_registration_pending',
        title: 'New agent registration needs review',
        body: `${firstName} ${lastName} (${email}) submitted an agent registration for founder approval.`,
        data: { userId: result.insertId, role }
      }).catch(error => console.error('Agent registration notification failed:', error.message));
      return res.status(201).json({ ok: true, role, roles: [role], pendingApproval: true, message: 'Your agent registration is pending founder approval.', approvalContact });
    }
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.cookie.maxAge = req.body.rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8;
    req.session.user = { id: result.insertId, firstName, lastName, roles: [role] };
    res.status(201).json({ ok: true, role, roles: [role], pendingApproval: false });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists. Try signing in instead.' });
    next(error);
  } finally { connection.release(); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT u.id, u.status, u.password_hash, u.mfa_enabled, u.mfa_secret_encrypted, p.first_name firstName, p.last_name lastName, GROUP_CONCAT(r.name) roles FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE u.email=? AND u.status IN ("active","pending") GROUP BY u.id, u.status, p.first_name, p.last_name',
      [String(req.body.email || '').toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash || ''))) {
      await pool.execute('INSERT INTO security_events (event_type, ip_address, metadata) VALUES ("failed_login", INET6_ATON(?), ?)', [req.ip, JSON.stringify({ email: String(req.body.email || '').trim().slice(0, 254) })]);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const roles = user.roles ? user.roles.split(',') : [];
    if (user.status === 'pending') {
      return res.status(403).json({ pendingApproval: true, error: 'Your agent account is awaiting administrator approval. Contact StayNest support if you need an update.' });
    }
    if (!roles.some(role => ['tenant', 'agent', 'administrator'].includes(role))) return res.status(403).json({ error: 'This account role is no longer supported. Contact StayNest support.' });
    if (user.mfa_enabled) {
      if (!req.body.mfaCode) return res.json({ mfaRequired: true });
      if (!user.mfa_secret_encrypted || !(await verify({ token: req.body.mfaCode, secret: decryptSecret(user.mfa_secret_encrypted) })).valid) return res.status(401).json({ error: 'Invalid MFA code' });
    }
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.cookie.maxAge = req.body.rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8;
    const [[subaccount]] = await pool.query('SELECT id, main_agent_user_id mainAgentId, label FROM agent_subaccounts WHERE subagent_user_id=? AND status="active"', [user.id]);
    let permissions = [];
    if (subaccount) {
      const [permissionRows] = await pool.query('SELECT permission_key permission FROM agent_subaccount_permissions WHERE subaccount_id=?', [subaccount.id]);
      permissions = permissionRows.map(row => row.permission);
    }
    req.session.user = { id: user.id, firstName: user.firstName || '', lastName: user.lastName || '', roles, isSubAgent: Boolean(subaccount), mainAgentId: subaccount?.mainAgentId || null, accountLabel: subaccount?.label || null, permissions };
    res.json({ ok: true, roles: req.session.user.roles });
  } catch (error) { next(error); }
});

app.post('/api/auth/password-reset/request', async (req, res, next) => {
  const genericResponse = { ok: true, message: 'If an account matches that email, password recovery instructions have been prepared.' };
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json(genericResponse);
    const [[user]] = await pool.query(
      'SELECT id, email, status FROM users WHERE email=? AND status IN ("active","pending") LIMIT 1',
      [email]
    );
    if (!user) return res.json(genericResponse);
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(token);
    await pool.query('UPDATE password_reset_tokens SET used_at=COALESCE(used_at, UTC_TIMESTAMP()) WHERE user_id=? AND used_at IS NULL', [user.id]);
    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), ?)',
      [user.id, tokenHash, PASSWORD_RESET_TTL_MINUTES, req.ip]
    );
    const resetUrl = `${process.env.PASSWORD_RESET_BASE_URL || `${req.protocol}://${req.get('host')}`}/index.html?reset=${encodeURIComponent(token)}`;
    if (process.env.NODE_ENV !== 'production') return res.json({ ...genericResponse, resetUrl, expiresInMinutes: PASSWORD_RESET_TTL_MINUTES });
    console.info(`Password reset email queued for ${email}; delivery service is not configured.`);
    return res.json(genericResponse);
  } catch (error) { next(error); }
});

app.post('/api/auth/password-reset/complete', async (req, res, next) => {
  const token = typeof req.body.token === 'string' ? req.body.token : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token) || !strongPassword(password)) {
    return res.status(400).json({ error: 'Use a valid reset link and a strong password with at least 12 characters, including three character types' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[reset]] = await connection.query(
      `SELECT pr.id, pr.user_id, u.status
       FROM password_reset_tokens pr JOIN users u ON u.id=pr.user_id
       WHERE pr.token_hash=? AND pr.used_at IS NULL AND pr.expires_at>UTC_TIMESTAMP()
       FOR UPDATE`,
      [hashResetToken(token)]
    );
    if (!reset || !['active', 'pending'].includes(reset.status)) {
      await connection.rollback();
      return res.status(400).json({ error: 'This password reset link is invalid or expired. Request a new one.' });
    }
    await connection.execute('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(password, 12), reset.user_id]);
    await connection.execute('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE id=?', [reset.id]);
    await connection.commit();
    await sessionStore.destroyUserSessions(reset.user_id);
    req.session.destroy(() => {});
    res.json({ ok: true, message: 'Your password has been updated. Sign in with your new password.' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

app.post('/api/auth/logout', requireAuth, (req, res, next) => req.session.destroy(error => error ? next(error) : res.status(204).end()));
app.get('/api/auth/me', async (req, res, next) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser?.id) return res.json({ user: sessionUser || null, impersonating: Boolean(req.session.impersonator) });
    const [[fresh]] = await pool.query(
      `SELECT u.id, p.first_name firstName, p.last_name lastName,
              GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') roles
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id=u.id
       LEFT JOIN user_roles ur ON ur.user_id=u.id
       LEFT JOIN roles r ON r.id=ur.role_id
       WHERE u.id=? AND u.status='active'
       GROUP BY u.id, p.first_name, p.last_name`,
      [sessionUser.id]
    );
    if (!fresh) return res.json({ user: null, impersonating: Boolean(req.session.impersonator) });
    const roles = fresh.roles ? fresh.roles.split(',') : [];
    const activeRole = roles[0] || null;
    req.session.user = { ...sessionUser, ...fresh, roles, activeRole };
    delete req.session.activeRole;
    res.json({ user: req.session.user, impersonating: Boolean(req.session.impersonator) });
  } catch (error) { next(error); }
});

app.get('/api/tenant/profile', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const [[profile]] = await pool.query(
      'SELECT u.id, u.email, u.phone, p.first_name firstName, p.last_name lastName, p.avatar_url avatarUrl, p.bio, p.city FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.id=? AND u.status="active"',
      [req.session.user.id]
    );
    const [following] = await pool.query(
      `SELECT u.id, p.first_name firstName, p.last_name lastName, ap.profile_image_url profileImageUrl, ap.bio,
        COALESCE(ap.followers_count, 0) followers, MAX(ab.badge_label) badgeLabel
       FROM agent_follows f
       JOIN users u ON u.id=f.agent_user_id AND u.status="active"
       JOIN user_profiles p ON p.user_id=u.id
       JOIN user_roles ur ON ur.user_id=u.id
       JOIN roles r ON r.id=ur.role_id AND r.name="agent"
       LEFT JOIN agent_profiles ap ON ap.user_id=u.id
       LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP())
       WHERE f.follower_user_id=? GROUP BY u.id, p.first_name, p.last_name, ap.profile_image_url, ap.bio, ap.followers_count ORDER BY f.created_at DESC`,
      [req.session.user.id]
    );
    const [wishlist] = await pool.query(
      'SELECT l.id, l.title, l.city, l.currency, l.nightly_price nightlyPrice, l.monthly_price monthlyPrice, (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl FROM saved_listings s JOIN listings l ON l.id=s.listing_id WHERE s.user_id=? ORDER BY s.created_at DESC',
      [req.session.user.id]
    );
    res.json({ profile, following, wishlist });
  } catch (error) { next(error); }
});

app.post('/api/tenant/profile/photo', requireAuth, requireRole('tenant'), upload.single('profilePic'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG, WebP, or AVIF profile image' });
    const stored = await storeUserProfileImage(req.file, req.session.user.id);
    await pool.execute('UPDATE user_profiles SET avatar_url=? WHERE user_id=?', [stored.url, req.session.user.id]);
    await audit(req, 'tenant_profile_photo_updated', 'user_profile', req.session.user.id);
    res.json({ avatarUrl: stored.url });
  } catch (error) { next(error); }
});

app.patch('/api/tenant/profile', requireAuth, requireRole('tenant'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const firstName = String(req.body.firstName || '').trim().slice(0, 80);
    const lastName = String(req.body.lastName || '').trim().slice(0, 80);
    const phone = String(req.body.phone || '').trim().slice(0, 32);
    const city = String(req.body.city || '').trim().slice(0, 100);
    const bio = String(req.body.bio || '').slice(0, 5000);
    if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name are required' });
    if (phone && !/^\+?[0-9][0-9\s().-]{6,24}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number' });
    await connection.beginTransaction();
    await connection.execute('UPDATE users SET phone=? WHERE id=?', [phone || null, req.session.user.id]);
    await connection.execute('UPDATE user_profiles SET first_name=?, last_name=?, display_name=?, bio=?, city=? WHERE user_id=?', [firstName, lastName, `${firstName} ${lastName}`.slice(0, 160), bio, city || null, req.session.user.id]);
    await connection.commit();
    req.session.user.firstName = firstName;
    req.session.user.lastName = lastName;
    await audit(req, 'tenant_profile_updated', 'user_profile', req.session.user.id);
    res.json({ ok: true, profile: { firstName, lastName, phone, city, bio } });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That phone number is already in use' });
    next(error);
  } finally { connection.release(); }
});

app.get('/api/agents/:id/profile', async (req, res, next) => {
  try {
    const [[profile]] = await pool.query(
      `SELECT u.id, u.email, p.first_name firstName, p.last_name lastName, p.avatar_url avatarUrl,
        ap.phone, ap.bio, ap.agency_name agencyName, ap.profile_image_url profileImageUrl, ap.followers_count followers, ap.following_count following,
        (u.last_login_at >= UTC_TIMESTAMP() - INTERVAL 15 MINUTE) online, ap.following_count following,
        ab.badge_label badgeLabel, ab.expires_at badgeExpiresAt,
        (SELECT AVG(r.rating) FROM reviews r JOIN listings rl ON rl.id=r.listing_id WHERE rl.agent_user_id=u.id AND r.status="published") agentRating,
        (SELECT COUNT(*) FROM reviews r JOIN listings rl ON rl.id=r.listing_id WHERE rl.agent_user_id=u.id AND r.status="published") agentReviewCount,
        (SELECT AVG(TIMESTAMPDIFF(MINUTE, b.created_at, b.confirmed_at))/60 FROM bookings b WHERE b.host_user_id=u.id AND b.confirmed_at IS NOT NULL) responseHours
       FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN agent_profiles ap ON ap.user_id=u.id
       LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP())
       JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
       WHERE u.id=? AND u.status="active" AND r.name="agent"
       ORDER BY ab.created_at DESC LIMIT 1`,
      [req.params.id]
    );
    if (!profile) return res.status(404).json({ error: 'Agent profile not found' });
    const [posts] = await pool.query(
      `SELECT l.id, l.title, l.description, l.city, l.currency, l.nightly_price nightlyPrice, l.monthly_price monthlyPrice, l.yearly_price yearlyPrice, l.status,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl,
        (SELECT lm.media_type FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) mediaType,
        (SELECT lm.caption FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) mediaCaption,
        (SELECT COUNT(*) FROM listing_likes ll WHERE ll.listing_id=l.id) likes,
        EXISTS(SELECT 1 FROM listing_likes myll WHERE myll.listing_id=l.id AND myll.user_id=?) liked,
        (SELECT COUNT(*) FROM listing_views lv WHERE lv.listing_id=l.id) views,
        ROUND((LOG10(1 + (SELECT COUNT(*) FROM listing_likes ll WHERE ll.listing_id=l.id)) * 3) +
          (LOG10(1 + (SELECT COUNT(*) FROM listing_views lv WHERE lv.listing_id=l.id)) * 0.75) +
          GREATEST(0, 2 - TIMESTAMPDIFF(DAY, COALESCE(l.published_at, l.created_at), UTC_TIMESTAMP()) / 30), 3) rankScore
       FROM listings l WHERE l.agent_user_id=? AND (l.status="published" OR (l.status="pending_review" AND ?=?))
       ORDER BY rankScore DESC, l.created_at DESC`,
      [req.session.user?.id || 0, req.params.id, req.session.user?.id || 0, req.params.id]
    );
    let following = false;
    if (req.session.user) {
      const [[follow]] = await pool.query('SELECT 1 AS followed FROM agent_follows WHERE follower_user_id=? AND agent_user_id=?', [req.session.user.id, req.params.id]);
      following = Boolean(follow);
    }
    res.json({ profile, posts, following });
  } catch (error) { next(error); }
});

app.get('/api/agents/:id/followers', async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT u.id, p.first_name firstName, p.last_name lastName, r.name role, ap.profile_image_url profileImageUrl FROM agent_follows f JOIN users u ON u.id=f.follower_user_id JOIN user_profiles p ON p.user_id=u.id LEFT JOIN agent_profiles ap ON ap.user_id=u.id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE f.agent_user_id=? ORDER BY f.created_at DESC LIMIT 100',
      [req.params.id]
    );
    res.json({ users });
  } catch (error) { next(error); }
});

app.get('/api/agents/:id/following', async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT u.id, p.first_name firstName, p.last_name lastName, r.name role, ap.profile_image_url profileImageUrl FROM agent_follows f JOIN users u ON u.id=f.agent_user_id JOIN user_profiles p ON p.user_id=u.id LEFT JOIN agent_profiles ap ON ap.user_id=u.id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE f.follower_user_id=? ORDER BY f.created_at DESC LIMIT 100',
      [req.params.id]
    );
    res.json({ users });
  } catch (error) { next(error); }
});

app.get('/api/agents', async (req, res, next) => {
  try {
    const { page, limit, offset } = boundedPage(req.query, { defaultLimit: 30, maxLimit: 100 });
    const [agents] = await pool.query(
      `SELECT u.id, COALESCE(p.first_name, 'StayNest') firstName, COALESCE(p.last_name, 'Agent') lastName, p.city, ap.profile_image_url profileImageUrl, ap.bio,
        (u.last_login_at >= UTC_TIMESTAMP() - INTERVAL 15 MINUTE) online,
        MAX(ab.badge_label) badgeLabel,
        ap.followers_count followers,
        COUNT(DISTINCT l.id) listings,
        COALESCE(AVG(l.average_rating), 0) rating,
        ROUND((LOG10(1 + ap.followers_count) * 3) + (LOG10(1 + COUNT(DISTINCT l.id)) * 2) +
          (COALESCE(AVG(l.average_rating), 0) * 1.5) + (LOG10(1 + COALESCE(SUM(ll.likes), 0)) * 1.5), 3) rankScore
       FROM users u
       JOIN user_profiles p ON p.user_id=u.id
       LEFT JOIN agent_profiles ap ON ap.user_id=u.id
       JOIN user_roles ur ON ur.user_id=u.id
       JOIN roles r ON r.id=ur.role_id
       LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP())
       LEFT JOIN listings l ON l.agent_user_id=u.id AND l.status="published"
       LEFT JOIN (SELECT listing_id, COUNT(*) likes FROM listing_likes GROUP BY listing_id) ll ON ll.listing_id=l.id
       WHERE u.status="active" AND r.name="agent"
       GROUP BY u.id, p.first_name, p.last_name, p.city, u.last_login_at, ap.profile_image_url, ap.bio, ap.followers_count
       ORDER BY rankScore DESC, p.first_name ASC, p.last_name ASC, u.id ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({ agents, page, limit, algorithm: 'followers+listings+ratings+engagement' });
  } catch (error) { next(error); }
});

app.get('/api/discover', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 100);
    const location = String(req.query.location || '').trim().slice(0, 100);
    const userId = req.session.user?.id || 0;
    const textLike = `%${query}%`;
    const locationLike = `%${location}%`;
    const [listings] = await pool.execute(
      `SELECT l.id, l.title, l.city, l.currency, l.nightly_price nightlyPrice, l.monthly_price monthlyPrice, l.yearly_price yearlyPrice,
        l.average_rating rating, l.review_count reviewCount,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl,
        ROUND(
          (CASE WHEN ? <> "" AND (l.title LIKE ? OR l.description LIKE ? OR l.city LIKE ? OR l.neighborhood LIKE ?) THEN 8 ELSE 0 END) +
          (CASE WHEN ? <> "" AND (l.city LIKE ? OR l.neighborhood LIKE ? OR l.address_line1 LIKE ?) THEN 7 ELSE 0 END) +
          (CASE WHEN l.city = (SELECT city FROM user_profiles WHERE user_id=?) THEN 5 ELSE 0 END) +
          (COALESCE(l.average_rating, 0) * 2) + (LOG10(1 + l.review_count) * 1.5) +
          (LOG10(1 + (SELECT COUNT(*) FROM listing_likes x WHERE x.listing_id=l.id)) * 2) +
          (LOG10(1 + (SELECT COUNT(*) FROM listing_views v WHERE v.listing_id=l.id)) * 0.75) +
          (CASE WHEN EXISTS (SELECT 1 FROM agent_follows f WHERE f.follower_user_id=? AND f.agent_user_id=l.agent_user_id) THEN 6 ELSE 0 END) +
          (CASE WHEN EXISTS (SELECT 1 FROM saved_listings s JOIN listings sl ON sl.id=s.listing_id WHERE s.user_id=? AND sl.city=l.city) THEN 4 ELSE 0 END) +
          GREATEST(0, 2 - TIMESTAMPDIFF(DAY, COALESCE(l.published_at, l.created_at), UTC_TIMESTAMP()) / 30), 3
        ) rankScore
       FROM listings l
       WHERE l.status="published" AND l.deleted_at IS NULL
       ORDER BY rankScore DESC, l.published_at DESC LIMIT 40`,
      [query, textLike, textLike, textLike, textLike, location, locationLike, locationLike, locationLike, userId, userId, userId]
    );
    res.json({ listings, algorithm: 'relevance+location+freshness+engagement+personalized-affinity' });
  } catch (error) { next(error); }
});

app.get('/api/showcase/posts', async (_req, res, next) => {
  try {
    const [posts] = await pool.query(
      `SELECT l.id, l.agent_user_id agentId, l.title, l.description, l.city, l.currency,
        l.nightly_price nightlyPrice, l.monthly_price monthlyPrice, l.yearly_price yearlyPrice,
        l.average_rating rating, l.review_count reviewCount,
        p.first_name firstName, p.last_name lastName, ap.profile_image_url profileImageUrl,
        ap.followers_count followers, sa.label subagentLabel,
        ab.badge_label badgeLabel,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl,
        (SELECT lm.media_type FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) mediaType,
        (SELECT COUNT(*) FROM listing_likes ll WHERE ll.listing_id=l.id) likes,
        (SELECT COUNT(*) FROM listing_views lv WHERE lv.listing_id=l.id) views,
        ROUND(
          (COALESCE(l.average_rating, 0) * 2) +
          (LOG10(1 + l.review_count) * 1.5) +
          (LOG10(1 + (SELECT COUNT(*) FROM listing_likes ll WHERE ll.listing_id=l.id)) * 2) +
          (LOG10(1 + (SELECT COUNT(*) FROM listing_views lv WHERE lv.listing_id=l.id)) * .75) +
          (LOG10(1 + COALESCE(ap.followers_count, 0)) * .5) +
          GREATEST(0, 2 - TIMESTAMPDIFF(DAY, COALESCE(l.published_at, l.created_at), UTC_TIMESTAMP()) / 30), 3
        ) rankScore
       FROM listings l
       JOIN users u ON u.id=l.agent_user_id AND u.status="active"
       JOIN user_profiles p ON p.user_id=u.id
       LEFT JOIN agent_profiles ap ON ap.user_id=u.id
       LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP())
       LEFT JOIN agent_subaccounts sa ON sa.subagent_user_id=u.id AND sa.status="active"
       WHERE l.status="published" AND l.deleted_at IS NULL
       ORDER BY rankScore DESC, l.published_at DESC, l.created_at DESC
       LIMIT 12`
    );
    res.json({ posts, algorithm: 'quality+engagement+freshness+agent-trust' });
  } catch (error) { next(error); }
});

app.get('/api/posts', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const sort = ['rank', 'recent', 'popular'].includes(String(req.query.sort)) ? String(req.query.sort) : 'rank';
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 60);
    const viewerId = Number(req.session.user?.id || 0);
    const personalized = Boolean(viewerId);
    const order = sort === 'recent' ? 'l.published_at DESC, l.created_at DESC' : sort === 'popular'
      ? 'likes DESC, views DESC, l.published_at DESC' : 'rank_score DESC, l.published_at DESC';
    const [posts] = await pool.query(
      `SELECT l.id, l.agent_user_id agentId, l.title, l.description, l.city, l.currency, l.nightly_price nightlyPrice,
        l.monthly_price monthlyPrice, l.average_rating rating, l.review_count reviewCount,
        p.first_name firstName, p.last_name lastName, ap.profile_image_url profileImageUrl,
        ab.badge_label badgeLabel,
        lm.public_url mediaUrl, lm.media_type mediaType, lm.caption mediaCaption,
        likes, views, EXISTS(SELECT 1 FROM listing_likes myll WHERE myll.listing_id=l.id AND myll.user_id=?) liked,
        ROUND((LOG10(1+COALESCE(likes,0))*2.5)+(LOG10(1+COALESCE(views,0))*.8)+(COALESCE(l.average_rating,0)*1.5)+
          GREATEST(0, 3-TIMESTAMPDIFF(DAY, COALESCE(l.published_at,l.created_at),UTC_TIMESTAMP())/14),3) rank_score
       FROM listings l
       ${personalized ? 'JOIN agent_follows f ON f.agent_user_id=l.agent_user_id AND f.follower_user_id=?' : ''}
       JOIN users u ON u.id=l.agent_user_id AND u.status='active'
       JOIN user_profiles p ON p.user_id=u.id
       LEFT JOIN agent_profiles ap ON ap.user_id=u.id
       LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP())
       LEFT JOIN listing_media lm ON lm.id=(SELECT x.id FROM listing_media x WHERE x.listing_id=l.id ORDER BY x.is_cover DESC,x.sort_order ASC LIMIT 1)
       LEFT JOIN (SELECT listing_id,COUNT(*) likes FROM listing_likes GROUP BY listing_id) lk ON lk.listing_id=l.id
       LEFT JOIN (SELECT listing_id,COUNT(*) views FROM listing_views GROUP BY listing_id) vw ON vw.listing_id=l.id
       WHERE l.status='published' AND l.deleted_at IS NULL
       ORDER BY ${order} LIMIT ?`, [viewerId, ...(personalized ? [viewerId] : []), limit]
    );
    res.json({ posts, algorithm: personalized ? 'followed-agents+engagement+freshness+quality' : 'published-agents+engagement+freshness+quality', personalized });
  } catch (error) { next(error); }
});

app.get('/api/search', async (req, res, next) => {
  try {
    const rawQuery = String(req.query.q || '').trim().slice(0, 100);
    const type = String(req.query.type || 'estate').toLowerCase();
    if (!['estate', 'location', 'price', 'agent', 'tenant'].includes(type)) return res.status(400).json({ error: 'Choose a valid search category' });
    if (type === 'tenant') {
      if (!req.session.user?.roles?.includes('agent')) return res.status(403).json({ error: 'Tenant search is available to agents only' });
      if (rawQuery.length < 2) return res.status(400).json({ error: 'Enter at least two characters to search' });
      const like = `%${rawQuery}%`;
      const [tenants] = await pool.execute(
        `SELECT u.id, p.first_name firstName, p.last_name lastName, p.city,
                COALESCE(NULLIF(p.avatar_url, ''), NULL) avatarUrl
         FROM users u
         JOIN user_profiles p ON p.user_id=u.id
         JOIN user_roles ur ON ur.user_id=u.id
         JOIN roles r ON r.id=ur.role_id
         WHERE u.status='active' AND r.name='tenant'
           AND (CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR p.city LIKE ?)
         ORDER BY p.first_name ASC, p.last_name ASC
         LIMIT 30`,
        [like, like]
      );
      return res.json({ type, tenants });
    }
    if (type === 'price') {
      const priceText = rawQuery.replace(/[$,\s]/g, '');
      if (!priceText || !Number.isFinite(Number(priceText)) || Number(priceText) < 0) return res.status(400).json({ error: 'Enter a valid maximum price, for example 1200' });
    } else if (rawQuery.length < 2) return res.status(400).json({ error: 'Enter at least two characters to search' });
    const query = type === 'price' ? rawQuery.replace(/[$,\s]/g, '') : rawQuery;
    const like = `%${query}%`;
    if (type === 'agent') {
      const [agents] = await pool.execute(
        `SELECT u.id, p.first_name firstName, p.last_name lastName, ap.profile_image_url profileImageUrl, ap.bio, ap.agency_name agencyName, ap.followers_count followers,
          ab.badge_label badgeLabel,
          sa.label subagentLabel,
          ROUND((CASE WHEN CONCAT(p.first_name, " ", p.last_name) LIKE ? THEN 10 ELSE 0 END) +
            (CASE WHEN ap.agency_name LIKE ? THEN 8 ELSE 0 END) +
              (LOG10(1 + ap.followers_count) * 3) + (LOG10(1 + COUNT(DISTINCT l.id)) * 2) +
            (COALESCE(AVG(l.average_rating), 0) * 1.5), 3) rankScore
         FROM users u JOIN user_profiles p ON p.user_id=u.id LEFT JOIN agent_profiles ap ON ap.user_id=u.id
         JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
         LEFT JOIN listings l ON l.agent_user_id=u.id AND l.status="published"
         LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP())
         LEFT JOIN agent_subaccounts sa ON sa.subagent_user_id=u.id AND sa.status="active"
         WHERE u.status="active" AND r.name="agent" AND (CONCAT(p.first_name, " ", p.last_name) LIKE ? OR ap.agency_name LIKE ? OR ap.bio LIKE ? OR sa.label LIKE ?)
         GROUP BY u.id, p.first_name, p.last_name, ap.profile_image_url, ap.bio, ap.agency_name, ap.followers_count, ab.badge_label, sa.label
         ORDER BY rankScore DESC, p.first_name LIMIT 30`,
        [like, like, like, like, like, like, like]
      );
      return res.json({ type, agents });
    }
    let where = 'l.status="published" AND l.deleted_at IS NULL AND (l.title LIKE ? OR l.description LIKE ? OR l.city LIKE ? OR l.neighborhood LIKE ? OR pt.name LIKE ?)';
    const params = [like, like, like, like, like];
    if (type === 'location') {
      where = 'l.status="published" AND l.deleted_at IS NULL AND (l.city LIKE ? OR l.neighborhood LIKE ? OR l.address_line1 LIKE ? OR l.region LIKE ?)';
      params.splice(0, params.length, like, like, like, like);
    }
    if (type === 'price') {
      const price = Number(query);
      where = 'l.status="published" AND l.deleted_at IS NULL AND (l.nightly_price <= ? OR l.monthly_price <= ? OR l.yearly_price <= ?)';
      params.splice(0, params.length, price, price, price);
    }
    const [listings] = await pool.execute(
      `SELECT l.id, l.title, l.city, l.neighborhood, l.region, l.currency, l.nightly_price nightlyPrice, l.monthly_price monthlyPrice, l.yearly_price yearlyPrice, l.average_rating rating, l.review_count reviewCount, l.updated_at updatedAt,
        up.first_name agentFirstName, up.last_name agentLastName,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl,
        ROUND((CASE WHEN l.title LIKE ? THEN 10 ELSE 0 END) + (CASE WHEN l.city LIKE ? THEN 8 ELSE 0 END) + (CASE WHEN pt.name LIKE ? THEN 5 ELSE 0 END) +
          (COALESCE(l.average_rating, 0) * 2) + LOG10(1 + l.review_count) +
          LOG10(1 + (SELECT COUNT(*) FROM listing_likes x WHERE x.listing_id=l.id)) * 2 +
          GREATEST(0, 2 - TIMESTAMPDIFF(DAY, COALESCE(l.published_at, l.created_at), UTC_TIMESTAMP()) / 30), 3) rankScore
       FROM listings l JOIN property_types pt ON pt.id=l.property_type_id
       LEFT JOIN user_profiles up ON up.user_id=l.agent_user_id
       WHERE ${where} ORDER BY rankScore DESC, l.updated_at DESC LIMIT 30`,
      [like, like, like, ...params]
    );
    res.json({ type, listings });
  } catch (error) { next(error); }
});

app.post('/api/agents/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const agentId = positiveId(req.params.id);
    if (!agentId) return res.status(400).json({ error: 'Choose a valid agent profile' });
    if (agentId === req.session.user.id) return res.status(400).json({ error: 'You cannot follow your own profile' });
    const [[agent]] = await pool.query(
      `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
       WHERE u.id=? AND u.status="active" AND r.name="agent"`,
      [agentId]
    );
    if (!agent) return res.status(404).json({ error: 'Agent profile not found' });
    await pool.execute('INSERT IGNORE INTO agent_follows (follower_user_id, agent_user_id) VALUES (?, ?)', [req.session.user.id, agentId]);
    await pool.execute('UPDATE agent_profiles SET followers_count=(SELECT COUNT(*) FROM agent_follows WHERE agent_user_id=?) WHERE user_id=?', [agentId, agentId]);
    void notifyUser(agentId, {
      type: 'agent_followed',
      title: 'You have a new follower',
      body: 'Someone followed your StayNest agent profile.',
      data: { followerId: req.session.user.id }
    }).catch(error => console.error('Follow notification failed:', error.message));
    const [[count]] = await pool.query('SELECT followers_count followers FROM agent_profiles WHERE user_id=?', [agentId]);
    res.json({ following: true, followers: Number(count?.followers || 0) });
  } catch (error) { next(error); }
});

app.delete('/api/agents/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const agentId = positiveId(req.params.id);
    if (!agentId) return res.status(400).json({ error: 'Choose a valid agent profile' });
    await pool.execute('DELETE FROM agent_follows WHERE follower_user_id=? AND agent_user_id=?', [req.session.user.id, agentId]);
    await pool.execute('UPDATE agent_profiles SET followers_count=(SELECT COUNT(*) FROM agent_follows WHERE agent_user_id=?) WHERE user_id=?', [agentId, agentId]);
    const [[count]] = await pool.query('SELECT followers_count followers FROM agent_profiles WHERE user_id=?', [agentId]);
    res.json({ following: false, followers: Number(count?.followers || 0) });
  } catch (error) { next(error); }
});

app.post('/api/messages', requireAuth, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    if (!(await isFeatureEnabled('messaging'))) return res.status(503).json({ error: 'Messaging is temporarily unavailable' });
    const recipientId = Number(req.body.recipientId);
    const body = String(req.body.body || '').trim();
    if (!Number.isInteger(recipientId) || recipientId <= 0 || recipientId === req.session.user.id) return res.status(400).json({ error: 'Choose a valid recipient' });
    if (!body || body.length > 2000) return res.status(400).json({ error: 'Message must be between 1 and 2000 characters' });
    const [[blocked]] = await connection.query(
      'SELECT 1 FROM user_blocks WHERE (blocker_user_id=? AND blocked_user_id=?) OR (blocker_user_id=? AND blocked_user_id=?) LIMIT 1',
      [req.session.user.id, recipientId, recipientId, req.session.user.id]
    );
    if (blocked) return res.status(403).json({ error: 'Messaging is unavailable for this user' });
    const [[recipient]] = await connection.query(
      'SELECT u.id, p.first_name firstName, p.last_name lastName FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.id=? AND u.status="active"',
      [recipientId]
    );
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    await connection.beginTransaction();
    const [[existing]] = await connection.query(
      'SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=? JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=? WHERE c.listing_id IS NULL AND c.booking_id IS NULL LIMIT 1',
      [req.session.user.id, recipientId]
    );
    let conversationId = existing?.id;
    if (!conversationId) {
      const [created] = await connection.execute('INSERT INTO conversations () VALUES ()');
      conversationId = created.insertId;
      await connection.execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)', [conversationId, req.session.user.id, conversationId, recipientId]);
    }
    const [message] = await connection.execute('INSERT INTO messages (conversation_id, sender_user_id, body) VALUES (?, ?, ?)', [conversationId, req.session.user.id, body]);
    await connection.commit();
    const senderName = `${req.session.user.firstName || 'A StayNest member'} ${req.session.user.lastName || ''}`.trim();
    void notifyUser(recipient.id, {
      type: 'new_message',
      title: `New message from ${senderName}`,
      body: body.length > 160 ? `${body.slice(0, 157)}...` : body,
      data: { conversationId, messageId: message.insertId, senderId: req.session.user.id }
    }).catch(error => console.error('Message notification failed:', error.message));
    res.status(201).json({ conversationId, messageId: message.insertId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

app.get('/api/messages', requireAuth, async (req, res, next) => {
  try {
    const { page, limit, offset } = boundedPage(req.query, { defaultLimit: 50, maxLimit: 100 });
    const [conversations] = await pool.execute(
      `SELECT c.id conversationId, c.created_at createdAt,
        MAX(m.created_at) lastMessageAt, SUBSTRING_INDEX(GROUP_CONCAT(m.body ORDER BY m.created_at DESC SEPARATOR '||'), '||', 1) lastMessage,
        other.id otherUserId, otherProfile.first_name otherFirstName, otherProfile.last_name otherLastName,
        SUM(CASE WHEN m.sender_user_id<>? AND m.created_at>COALESCE(member.last_read_at,'1000-01-01') THEN 1 ELSE 0 END) unread
       FROM conversations c
       JOIN conversation_members member ON member.conversation_id=c.id AND member.user_id=?
       JOIN conversation_members otherMember ON otherMember.conversation_id=c.id AND otherMember.user_id<>?
       JOIN users other ON other.id=otherMember.user_id
       JOIN user_profiles otherProfile ON otherProfile.user_id=other.id
       LEFT JOIN messages m ON m.conversation_id=c.id AND m.deleted_at IS NULL AND m.created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY
       GROUP BY c.id, c.created_at, other.id, otherProfile.first_name, otherProfile.last_name, member.last_read_at
       HAVING MAX(m.created_at) IS NOT NULL
       ORDER BY lastMessageAt DESC, c.created_at DESC LIMIT ? OFFSET ?`,
      [req.session.user.id, req.session.user.id, req.session.user.id, limit, offset]
    );
    res.json({ conversations, page, limit });
  } catch (error) { next(error); }
});

app.get('/api/messages/unread-count', requireAuth, async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) unread
       FROM messages m
       JOIN conversation_members member ON member.conversation_id=m.conversation_id AND member.user_id=?
       WHERE m.sender_user_id<>? AND m.deleted_at IS NULL
       AND m.created_at>COALESCE(member.last_read_at,'1000-01-01')`,
      [req.session.user.id, req.session.user.id]
    );
    res.json({ unread: Number(row?.unread || 0) });
  } catch (error) { next(error); }
});

app.get('/api/messages/:conversationId', requireAuth, async (req, res, next) => {
  try {
    const conversationId = positiveId(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'Choose a valid conversation' });
    const { page, limit, offset } = boundedPage(req.query, { defaultLimit: 100, maxLimit: 100 });
    const [[member]] = await pool.execute('SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?', [conversationId, req.session.user.id]);
    if (!member) return res.status(403).json({ error: 'You do not have access to this conversation' });
    const [messages] = await pool.execute(
      `SELECT m.id, m.body, m.sender_user_id senderId, m.created_at createdAt,
        p.first_name firstName, p.last_name lastName
       FROM messages m JOIN users u ON u.id=m.sender_user_id JOIN user_profiles p ON p.user_id=u.id
       WHERE m.conversation_id=? AND m.deleted_at IS NULL AND m.created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
      [conversationId, limit, offset]
    );
    await pool.execute('UPDATE conversation_members SET last_read_at=UTC_TIMESTAMP() WHERE conversation_id=? AND user_id=?', [conversationId, req.session.user.id]);
    res.json({ messages: messages.reverse(), page, limit });
  } catch (error) { next(error); }
});

app.get('/api/notifications', requireAuth, async (req, res, next) => {
  try {
    const { page, limit, offset } = boundedPage(req.query);
    const [notifications] = await pool.execute(
      'SELECT id, type, title, body, data, read_at readAt, created_at createdAt FROM notifications WHERE user_id=? AND created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
      [req.session.user.id, limit, offset]
    );
    const [[counts]] = await pool.query('SELECT COUNT(*) unread FROM notifications WHERE user_id=? AND created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY AND read_at IS NULL', [req.session.user.id]);
    res.json({ notifications, unread: counts.unread, page, limit });
  } catch (error) { next(error); }
});

app.post('/api/notifications/read', requireAuth, async (req, res, next) => {
  try {
    await pool.execute('UPDATE notifications SET read_at=COALESCE(read_at, UTC_TIMESTAMP()) WHERE user_id=? AND created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY', [req.session.user.id]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post('/api/users/:id/block', requireAuth, async (req, res, next) => {
  try {
    const blockedUserId = positiveId(req.params.id);
    if (!blockedUserId || blockedUserId === req.session.user.id) return res.status(400).json({ error: 'Choose a valid user' });
    await pool.execute('INSERT IGNORE INTO user_blocks (blocker_user_id, blocked_user_id) VALUES (?, ?)', [req.session.user.id, blockedUserId]);
    await audit(req, 'user_blocked', 'user', blockedUserId);
    res.json({ blocked: true });
  } catch (error) { next(error); }
});

app.delete('/api/users/:id/block', requireAuth, async (req, res, next) => {
  try {
    const blockedUserId = positiveId(req.params.id);
    if (!blockedUserId) return res.status(400).json({ error: 'Choose a valid user' });
    await pool.execute('DELETE FROM user_blocks WHERE blocker_user_id=? AND blocked_user_id=?', [req.session.user.id, blockedUserId]);
    await audit(req, 'user_unblocked', 'user', blockedUserId);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/agent/geocode', requireAuth, requireAgentAccess('listings.create'), async (req, res, next) => {
  try {
    const address = String(req.query.address || '').trim();
    if (!address || address.length > 240) return res.status(400).json({ error: 'Enter a valid address to search' });
    const result = await geocodeAddress(address);
    if (!result) return res.status(404).json({ error: 'No OpenStreetMap result found for that address' });
    res.json({ location: result });
  } catch (error) { next(error); }
});

app.post('/api/reports', requireAuth, async (req, res, next) => {
  try {
    const entityType = nonEmptyString(req.body.entityType, 40);
    const reason = nonEmptyString(req.body.reason, 120);
    const entityId = req.body.entityId == null ? null : positiveId(req.body.entityId);
    const reportedUserId = req.body.reportedUserId == null ? null : positiveId(req.body.reportedUserId);
    const details = req.body.details ? nonEmptyString(req.body.details, 1000) : null;
    if (!entityType || !reason || (req.body.entityId != null && !entityId) || (req.body.reportedUserId != null && !reportedUserId)) return res.status(400).json({ error: 'Invalid report' });
    const [result] = await pool.execute('INSERT INTO user_reports (reporter_user_id, reported_user_id, entity_type, entity_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)', [req.session.user.id, reportedUserId, entityType, entityId, reason, details]);
    void notifyAdministrators({
      type: 'listing_report',
      title: 'New listing report requires review',
      body: `${entityType} report: ${reason}`,
      data: { reportId: Number(result.insertId), entityType, entityId }
    }).catch(error => console.error('Administrator report notification failed:', error.message));
    await audit(req, 'report_created', entityType, entityId, { reportedUserId, reason });
    res.status(201).json({ id: result.insertId, status: 'open' });
  } catch (error) { next(error); }
});

app.post('/api/listings/:id/view', async (req, res, next) => {
  try {
    const listingId = positiveId(req.params.id);
    if (!listingId) return res.status(400).json({ error: 'Choose a valid listing' });
    const [[listing]] = await pool.query(
      'SELECT id FROM listings WHERE id=? AND deleted_at IS NULL AND status="published"',
      [listingId]
    );
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    await pool.execute(
      'INSERT INTO listing_views (listing_id, viewer_user_id) VALUES (?, ?)',
      [listingId, req.session.user?.id || null]
    );
    const [[row]] = await pool.query(
      'SELECT COUNT(*) views FROM listing_views WHERE listing_id=?',
      [listingId]
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json({ listingId, viewed: true, views: Number(row.views) });
  } catch (error) { next(error); }
});

app.post('/api/listings/:id/like', requireAuth, async (req, res, next) => {
  try { await pool.execute('INSERT IGNORE INTO listing_likes (user_id, listing_id) VALUES (?, ?)', [req.session.user.id, req.params.id]); const [[row]] = await pool.query('SELECT COUNT(*) likes FROM listing_likes WHERE listing_id=?', [req.params.id]); res.json({ liked: true, likes: row.likes }); } catch (error) { next(error); }
});

app.delete('/api/listings/:id/like', requireAuth, async (req, res, next) => {
  try { await pool.execute('DELETE FROM listing_likes WHERE user_id=? AND listing_id=?', [req.session.user.id, req.params.id]); const [[row]] = await pool.query('SELECT COUNT(*) likes FROM listing_likes WHERE listing_id=?', [req.params.id]); res.json({ liked: false, likes: row.likes }); } catch (error) { next(error); }
});

app.patch('/api/agent/profile', requireAuth, requireAgentAccess('profile.manage'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const firstName = String(req.body.firstName || '').trim().slice(0, 80);
    const lastName = String(req.body.lastName || '').trim().slice(0, 80);
    const phone = String(req.body.phone || '').trim().slice(0, 32);
    const city = String(req.body.city || '').trim().slice(0, 100);
    const bio = String(req.body.bio || '').slice(0, 5000);
    if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name are required' });
    if (phone && !/^\+?[0-9][0-9\s().-]{6,24}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number' });
    await connection.beginTransaction();
    await connection.execute('UPDATE user_profiles SET first_name=?, last_name=?, display_name=?, city=? WHERE user_id=?', [firstName, lastName, `${firstName} ${lastName}`.slice(0, 160), city || null, req.session.user.id]);
    await connection.execute('UPDATE agent_profiles SET phone=?, bio=? WHERE user_id=?', [phone || null, bio, req.session.user.id]);
    await connection.commit();
    req.session.user.firstName = firstName;
    req.session.user.lastName = lastName;
    res.json({ ok: true, profile: { firstName, lastName, phone, city, bio } });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

app.post('/api/agent/profile/photo', requireAuth, requireAgentAccess('profile.manage'), upload.single('profilePic'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG, WebP, or AVIF profile image' });
    const stored = await storeAgentProfileImage(req.file, req.session.user.id);
    await pool.execute('UPDATE agent_profiles SET profile_image_url=? WHERE user_id=?', [stored.url, req.session.user.id]);
    await audit(req, 'agent_profile_photo_updated', 'agent_profile', req.session.user.id);
    res.json({ profileImageUrl: stored.url });
  } catch (error) { next(error); }
});

app.get('/api/account/bookings', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT b.id, b.booking_code, b.booking_kind, b.appointment_at, b.check_in, b.check_out, b.total_amount, b.currency, b.status, b.created_at, l.id listing_id, l.title, l.slug FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE b.guest_user_id=? ORDER BY b.created_at DESC',
      [req.session.user.id]
    );
    res.json({ bookings: rows });
  } catch (error) { next(error); }
});

app.get('/api/bookings/:id', requireAuth, async (req, res, next) => {
  try {
    const [[booking]] = await pool.query(
      `SELECT b.id, b.booking_code bookingCode, b.booking_kind bookingKind, b.appointment_at appointmentAt,
        b.check_in checkIn, b.check_out checkOut, b.guests, b.total_amount totalAmount, b.currency, b.status,
        b.created_at createdAt, l.id listingId, l.title, l.city, l.address_line1 addressLine1,
        u.id tenantId, p.first_name firstName, p.last_name lastName, u.email, u.phone
       FROM bookings b JOIN listings l ON l.id=b.listing_id
       JOIN users u ON u.id=b.guest_user_id JOIN user_profiles p ON p.user_id=u.id
       WHERE b.id=? AND (b.guest_user_id=? OR b.host_user_id=? OR l.agent_user_id=?)`,
      [req.params.id, req.session.user.id, req.session.user.id, agentOwnerId(req) || 0]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking });
  } catch (error) { next(error); }
});

app.get('/api/account/summary', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const [[counts]] = await pool.query(
      'SELECT (SELECT COUNT(*) FROM bookings WHERE guest_user_id=? AND status IN ("pending","payment_pending","confirmed")) upcomingBookings, (SELECT COUNT(*) FROM saved_listings WHERE user_id=?) savedHomes, (SELECT COUNT(*) FROM search_alerts WHERE user_id=? AND is_active=TRUE) searchAlerts',
      [req.session.user.id, req.session.user.id, req.session.user.id]
    );
    res.json({ role: 'tenant', ...counts });
  } catch (error) { next(error); }
});

app.get('/api/host/listings', requireAuth, requireHostRole, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, slug, status, rental_mode, currency, nightly_price, monthly_price, yearly_price, average_rating, review_count, updated_at FROM listings WHERE owner_user_id=? OR agent_user_id=? ORDER BY updated_at DESC',
      [req.session.user.id, req.session.user.id]
    );
    res.json({ listings: rows });
  } catch (error) { next(error); }
});

app.get('/api/agent/summary', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    const ownerId = agentOwnerId(req);
    const [[counts]] = await pool.query(
      'SELECT (SELECT COUNT(*) FROM listings WHERE agent_user_id=? AND deleted_at IS NULL) assignedListings, (SELECT COUNT(*) FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE l.agent_user_id=? AND b.status="pending") pendingBookings, (SELECT COUNT(*) FROM identity_verifications WHERE user_id=? AND status="pending") verificationStatus',
      [ownerId, ownerId, ownerId]
    );
    res.json({ role: 'agent', ...counts });
  } catch (error) { next(error); }
});

app.post('/api/presence/ping', requireAuth, async (req, res, next) => {
  try {
    await pool.execute('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=?', [req.session.user.id]);
    res.json({ online: true, at: new Date().toISOString() });
  } catch (error) { next(error); }
});

app.get('/api/agent/attention', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    const ownerId = agentOwnerId(req);
    const [[counts]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE l.agent_user_id=? AND b.status='pending') pendingBookings,
        (SELECT COUNT(*) FROM listings WHERE agent_user_id=? AND status IN ('pending_review','rejected')) listingActions,
        (SELECT COUNT(*) FROM identity_verifications WHERE user_id=? AND status='pending') pendingVerification,
        (SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL AND created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY) unreadNotifications,
        (SELECT COUNT(*) FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE l.agent_user_id=? AND b.status='pending' AND b.created_at < UTC_TIMESTAMP() - INTERVAL 24 HOUR) staleBookings`,
      [ownerId, ownerId, ownerId, req.session.user.id, ownerId]
    );
    if (Number(counts.staleBookings) > 0) {
      const [[recent]] = await pool.query(
        'SELECT id FROM notifications WHERE user_id=? AND type="response_time_nudge" AND created_at >= UTC_TIMESTAMP() - INTERVAL 24 HOUR LIMIT 1',
        [req.session.user.id]
      );
      if (!recent) {
        await notifyUser(req.session.user.id, {
          type: 'response_time_nudge',
          title: 'A few booking requests need attention',
          body: `${counts.staleBookings} booking request(s) have been waiting for more than 24 hours. A quick response helps guests plan confidently.`,
          data: { staleBookings: Number(counts.staleBookings) }
        });
      }
    }
    res.json({ attention: { ...counts, staleBookings: Number(counts.staleBookings) } });
  } catch (error) { next(error); }
});

app.get('/api/marketplace/live', async (req, res, next) => {
  try {
    const [listings] = await pool.query(
      `SELECT l.id, l.title, l.city, l.currency, l.nightly_price nightlyPrice, l.monthly_price monthlyPrice,
        l.average_rating rating, l.review_count reviewCount, l.updated_at updatedAt,
        p.first_name firstName, p.last_name lastName, ap.profile_image_url profileImageUrl,
        (u.last_login_at >= UTC_TIMESTAMP() - INTERVAL 15 MINUTE) online,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl
       FROM listings l
       JOIN users u ON u.id=l.agent_user_id
       JOIN user_profiles p ON p.user_id=u.id
       LEFT JOIN agent_profiles ap ON ap.user_id=u.id
       WHERE l.status='published' AND l.deleted_at IS NULL AND u.status='active'
       ORDER BY (COALESCE(l.average_rating,0) * 2 + LOG10(1 + l.review_count) +
         LOG10(1 + (SELECT COUNT(*) FROM listing_views lv WHERE lv.listing_id=l.id))) DESC, l.updated_at DESC
       LIMIT 12`
    );
    res.json({ listings, generatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

app.get('/api/agent/settings', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    const ownerId = req.session.user.isSubAgent ? req.session.user.mainAgentId : req.session.user.id;
    const [[owner]] = await pool.query('SELECT user_id id, first_name firstName, last_name lastName FROM user_profiles WHERE user_id=?', [ownerId]);
    const [subagents] = await pool.query(
      `SELECT sa.id, sa.subagent_user_id userId, sa.label, sa.status, u.email, u.phone,
        p.first_name firstName, p.last_name lastName, p.avatar_url avatarUrl,
        GROUP_CONCAT(ap.permission_key ORDER BY ap.permission_key) permissions
       FROM agent_subaccounts sa JOIN users u ON u.id=sa.subagent_user_id
       JOIN user_profiles p ON p.user_id=u.id
       LEFT JOIN agent_subaccount_permissions ap ON ap.subaccount_id=sa.id
       WHERE sa.main_agent_user_id=? GROUP BY sa.id, sa.subagent_user_id, sa.label, sa.status, u.email, u.phone, p.first_name, p.last_name, p.avatar_url
       ORDER BY sa.created_at DESC`,
      [ownerId]
    );
    res.json({ owner, currentUser: req.session.user, permissions: SUB_AGENT_PERMISSIONS, subagents: subagents.map(agent => ({ ...agent, permissions: agent.permissions ? agent.permissions.split(',') : [] })) });
  } catch (error) { next(error); }
});

app.post('/api/agent/subagents', requireAuth, requireRole('agent'), upload.single('profilePic'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    if (req.session.user.isSubAgent) return res.status(403).json({ error: 'Only the main agent account can create sub-agents' });
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const location = String(req.body.location || '').trim().slice(0, 100);
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const label = String(req.body.label || '').trim().slice(0, 120);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    let permissions;
    try { permissions = JSON.parse(String(req.body.permissions || '[]')); } catch { return res.status(400).json({ error: 'Permissions must be a valid list' }); }
    const allowed = new Set(SUB_AGENT_PERMISSIONS.map(item => item.key));
    permissions = [...new Set(permissions)].filter(permission => allowed.has(permission));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) return res.status(400).json({ error: 'Enter a valid email and a 12-character password' });
    if (!firstName || !lastName || !label) return res.status(400).json({ error: 'Name and account label are required' });
    if (!permissions.length) return res.status(400).json({ error: 'Choose at least one action before creating this sub-agent' });
    await connection.beginTransaction();
    const [result] = await connection.execute('INSERT INTO users (email, phone, password_hash, status) VALUES (?, ?, ?, "pending")', [email, phone || null, await bcrypt.hash(password, 12)]);
    await connection.execute('INSERT INTO user_profiles (user_id, first_name, last_name, city, avatar_url) VALUES (?, ?, ?, ?, ?)', [result.insertId, firstName, lastName, location || null, req.file ? (await storeUserProfileImage(req.file, result.insertId)).url : DEFAULT_PROFILE_AVATAR]);
    await connection.execute('INSERT INTO agent_profiles (user_id, bio) VALUES (?, ?)', [result.insertId, `Sub-agent for ${req.session.user.firstName || 'StayNest agent'}`]);
    await connection.execute('INSERT INTO user_roles (user_id, role_id, assigned_by) SELECT ?, id, ? FROM roles WHERE name="agent"', [result.insertId, req.session.user.id]);
    const [account] = await connection.execute('INSERT INTO agent_subaccounts (main_agent_user_id, subagent_user_id, label, status) VALUES (?, ?, ?, "pending")', [req.session.user.id, result.insertId, label]);
    for (const permission of permissions) await connection.execute('INSERT INTO agent_subaccount_permissions (subaccount_id, permission_key) VALUES (?, ?)', [account.insertId, permission]);
    await connection.commit();
    await audit(req, 'subagent_created', 'agent_subaccount', account.insertId, { permissions });
    const permissionLabels = SUB_AGENT_PERMISSIONS
      .filter(item => permissions.includes(item.key))
      .map(item => item.label);
    const notificationData = {
      subagentId: account.insertId,
      userId: result.insertId,
      label,
      email,
      permissions
    };
    void notifyUser(req.session.user.id, {
      type: 'subagent_created',
      title: `${label} is pending founder approval`,
      body: `${firstName} ${lastName} has been added as a sub-agent. Founder approval is required before they can sign in.`,
      data: notificationData
    }).catch(error => console.error('Main agent sub-agent notification failed:', error.message));
    void notifyAdministrators({
      type: 'subagent_registration_pending',
      title: 'New sub-agent registration needs review',
      body: `${firstName} ${lastName} (${email}) was created by ${req.session.user.firstName || 'a main agent'} and is awaiting founder approval.`,
      data: { ...notificationData, mainAgentId: req.session.user.id }
    }).catch(error => console.error('Sub-agent registration notification failed:', error.message));
    void notifyUser(result.insertId, {
      type: 'subagent_pending',
      title: `Your ${label} account is pending approval`,
      body: `Your StayNest sub-agent account was created by your main agent. You can sign in after founder approval.`,
      data: { ...notificationData, mainAgentId: req.session.user.id }
    }).catch(error => console.error('Sub-agent welcome notification failed:', error.message));
    res.status(201).json({
      id: result.insertId,
      subaccountId: account.insertId,
      label,
      email,
      permissions,
      permissionLabels,
      pendingApproval: true,
      message: `${firstName} ${lastName} was added and is pending founder approval.`
    });
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { error.rollbackError = rollbackError; }
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That email or phone is already in use' });
    next(error);
  } finally { connection.release(); }
});

app.patch('/api/agent/subagents/:id', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    if (req.session.user.isSubAgent) return res.status(403).json({ error: 'Only the main agent account can manage sub-agents' });
    let permissions = req.body.permissions;
    const allowed = new Set(SUB_AGENT_PERMISSIONS.map(item => item.key));
    permissions = [...new Set(Array.isArray(permissions) ? permissions : [])].filter(permission => allowed.has(permission));
    if (!permissions.length) return res.status(400).json({ error: 'Keep at least one action enabled for this sub-agent' });
    const [[account]] = await pool.query('SELECT id FROM agent_subaccounts WHERE id=? AND main_agent_user_id=?', [req.params.id, req.session.user.id]);
    if (!account) return res.status(404).json({ error: 'Sub-agent not found' });
    await pool.query('DELETE FROM agent_subaccount_permissions WHERE subaccount_id=?', [account.id]);
    for (const permission of permissions) await pool.execute('INSERT INTO agent_subaccount_permissions (subaccount_id, permission_key) VALUES (?, ?)', [account.id, permission]);
    if (req.body.status && ['active', 'suspended', 'revoked'].includes(req.body.status)) await pool.execute('UPDATE agent_subaccounts SET status=? WHERE id=?', [req.body.status, account.id]);
    await audit(req, 'subagent_permissions_updated', 'agent_subaccount', account.id, { permissions });
    res.json({ ok: true, permissions });
  } catch (error) { next(error); }
});

app.post('/api/agent/listings', requireAuth, requireAgentAccess('listings.create'), agentListingUpload.fields([{ name: 'document', maxCount: 1 }, { name: 'media', maxCount: 10 }]), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { title, description, city, addressLine1, countryCode = 'KE', propertyType = 'apartment', nightlyPrice, monthlyPrice, yearlyPrice, rentalMode = 'short_term', documentType = 'business_license', documentCountry = 'KE', documentLast4 } = req.body;
    const latitude = Number(req.body.latitude), longitude = Number(req.body.longitude);
    const document = req.files?.document?.[0], media = req.files?.media || [];
    if (!title || !description || !city || !addressLine1 || (!nightlyPrice && !monthlyPrice && !yearlyPrice)) return res.status(400).json({ error: 'Title, description, address, city, and a price are required' });
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return res.status(400).json({ error: 'Choose the listing location on the OpenStreetMap preview' });
    if (!document) return res.status(400).json({ error: 'Agent registration document is required before publishing a property' });
    if (!media.length) return res.status(400).json({ error: 'Upload at least one estate image or video' });
    if (!['short_term', 'long_term', 'both'].includes(rentalMode)) return res.status(400).json({ error: 'Choose a valid rental duration' });
    if (!['national_id', 'passport', 'drivers_license', 'business_license'].includes(documentType)) return res.status(400).json({ error: 'Invalid registration document type' });
    const [types] = await connection.execute('SELECT id FROM property_types WHERE name=?', [propertyType]);
    if (!types.length) return res.status(400).json({ error: 'Invalid property type' });
    const slug = `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'INSERT INTO listings (owner_user_id, agent_user_id, property_type_id, title, slug, description, status, city, address_line1, country_code, latitude, longitude, nightly_price, monthly_price, yearly_price) VALUES (?, ?, ?, ?, ?, ?, "pending_review", ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [agentOwnerId(req), agentOwnerId(req), types[0].id, title, slug, description, city, addressLine1, countryCode, latitude, longitude, nightlyPrice || null, monthlyPrice || null, yearlyPrice || null]
    );
    const storedDocument = await storePrivateDocument(document, agentOwnerId(req));
    await connection.execute('INSERT INTO identity_verifications (user_id, document_type, document_country, document_last4, document_file_key) VALUES (?, ?, ?, ?, ?)', [agentOwnerId(req), documentType, documentCountry, documentLast4 || null, storedDocument.key]);
    for (const [index, file] of media.entries()) {
      const isVideo = file.mimetype.startsWith('video/');
      const stored = isVideo ? await storeListingVideo(file, result.insertId) : await storeListingImage(file, result.insertId);
      await connection.execute('INSERT INTO listing_media (listing_id, media_type, storage_key, public_url, caption, sort_order, is_cover) VALUES (?, ?, ?, ?, ?, ?, ?)', [result.insertId, isVideo ? 'video' : 'image', stored.key, stored.url, String(req.body[`caption${index}`] || '').slice(0, 255), index, index === 0]);
    }
    await connection.commit();
    await audit(req, 'agent_listing_created', 'listing', result.insertId);
    void notifyAdministrators({
      type: 'listing_pending_moderation',
      title: 'New agent listing needs moderation',
      body: `"${title}" was submitted by ${req.session.user.firstName || 'an agent'} and is pending review.`,
      data: { listingId: result.insertId, status: 'pending_review' }
    }).catch(error => console.error('Listing moderation notification failed:', error.message));
    res.status(201).json({ id: result.insertId, status: 'pending_review' });
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { error.rollbackError = rollbackError; }
    next(error);
  } finally { connection.release(); }
});

app.get('/api/host/bookings', requireAuth, requireHostRole, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT b.id, b.booking_code, b.check_in, b.check_out, b.total_amount, b.currency, b.status, l.title FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE b.host_user_id=? ORDER BY b.created_at DESC',
      [req.session.user.id]
    );
    res.json({ bookings: rows });
  } catch (error) { next(error); }
});

app.get('/api/agent/bookings', requireAuth, requireAgentAccess('bookings.view'), async (req, res, next) => {
  try {
    const [bookings] = await pool.execute(
      `SELECT b.id, b.booking_code bookingCode, b.booking_kind bookingKind, b.appointment_at appointmentAt, b.check_in checkIn, b.check_out checkOut, b.guests,
        b.total_amount totalAmount, b.currency, b.status, b.created_at createdAt,
        l.id listingId, l.title, l.city, l.address_line1 addressLine1,
        u.id tenantId, p.first_name firstName, p.last_name lastName, u.email, u.phone
       FROM bookings b
       JOIN listings l ON l.id=b.listing_id
       JOIN users u ON u.id=b.guest_user_id
       JOIN user_profiles p ON p.user_id=u.id
       WHERE l.agent_user_id=? ORDER BY b.created_at DESC LIMIT 100`,
      [agentOwnerId(req)]
    );
    res.json({ bookings });
  } catch (error) { next(error); }
});

app.post('/api/bookings/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const [result] = await pool.execute('UPDATE bookings SET status="cancelled", cancellation_reason=?, cancelled_at=UTC_TIMESTAMP() WHERE id=? AND guest_user_id=? AND status IN ("pending","payment_pending","confirmed")', [String(req.body.reason || 'Guest cancellation').slice(0, 500), req.params.id, req.session.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Active booking not found' });
    await pool.execute('DELETE FROM booking_date_locks WHERE booking_id=?', [req.params.id]);
    await audit(req, 'booking_cancelled', 'booking', req.params.id);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.patch('/api/bookings/:id/reschedule', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const checkIn = String(req.body.checkIn || '');
    const checkOut = String(req.body.checkOut || '');
    if (!isValidDate(checkIn) || !isValidDate(checkOut) || checkOut <= checkIn) return res.status(400).json({ error: 'Choose valid new dates' });
    const [overlaps] = await pool.execute('SELECT id FROM bookings WHERE listing_id=(SELECT listing_id FROM bookings WHERE id=? AND guest_user_id=?) AND id<>? AND status IN ("pending","payment_pending","confirmed") AND check_in < ? AND check_out > ?', [req.params.id, req.session.user.id, req.params.id, checkOut, checkIn]);
    if (overlaps.length) return res.status(409).json({ error: 'Those dates are no longer available' });
    const [result] = await pool.execute('UPDATE bookings SET check_in=?, check_out=?, status="pending" WHERE id=? AND guest_user_id=? AND status IN ("pending","confirmed")', [checkIn, checkOut, req.params.id, req.session.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Booking cannot be rescheduled' });
    await pool.execute('DELETE FROM booking_date_locks WHERE booking_id=?', [req.params.id]);
    await audit(req, 'booking_rescheduled', 'booking', req.params.id);
    res.json({ ok: true, status: 'pending' });
  } catch (error) { next(error); }
});

app.post('/api/host/bookings/:id/decision', requireAuth, requireHostRole, async (req, res, next) => {
  try {
    const status = req.body.status === 'confirmed' ? 'confirmed' : req.body.status === 'declined' ? 'declined' : null;
    if (!status) return res.status(400).json({ error: 'Invalid booking decision' });
    const [result] = await pool.execute('UPDATE bookings SET status=?, confirmed_at=IF(?="confirmed", UTC_TIMESTAMP(), confirmed_at) WHERE id=? AND host_user_id=? AND status="pending"', [status, status, req.params.id, req.session.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Pending booking not found' });
    await audit(req, `booking_${status}`, 'booking', req.params.id);
    res.json({ ok: true, status });
  } catch (error) { next(error); }
});

app.post('/api/agent/bookings/:id/decision', requireAuth, requireAgentAccess('bookings.manage'), async (req, res, next) => {
  try {
    const status = req.body.status === 'confirmed' ? 'confirmed' : req.body.status === 'declined' ? 'declined' : null;
    if (!status) return res.status(400).json({ error: 'Choose approve or decline' });
    const [result] = await pool.execute(
      'UPDATE bookings b JOIN listings l ON l.id=b.listing_id SET b.status=?, b.confirmed_at=IF(?="confirmed", UTC_TIMESTAMP(), b.confirmed_at) WHERE b.id=? AND l.agent_user_id=? AND b.status="pending"',
      [status, status, req.params.id, req.session.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Pending booking request not found' });
    const [[booking]] = await pool.query(
      'SELECT b.guest_user_id guestId, b.booking_code bookingCode, l.title, b.check_in checkIn, b.check_out checkOut FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE b.id=?',
      [req.params.id]
    );
    if (status === 'declined') await pool.execute('DELETE FROM booking_date_locks WHERE booking_id=?', [req.params.id]);
    void notifyUser(booking.guestId, {
      type: `booking_${status}`,
      title: status === 'confirmed' ? 'Booking approved' : 'Booking declined',
      body: `${booking.title} · ${booking.checkIn} to ${booking.checkOut}`,
      data: { bookingId: Number(req.params.id), status }
    }).catch(error => console.error('Tenant booking notification failed:', error.message));
    await audit(req, `agent_booking_${status}`, 'booking', req.params.id);
    res.json({ ok: true, status });
  } catch (error) { next(error); }
});

app.post('/api/listings/:id/save', requireAuth, async (req, res, next) => {
  try {
    if (!req.session.user.roles?.includes('tenant')) return res.status(403).json({ error: 'Only tenant accounts can save listings' });
    const listingId = positiveId(req.params.id);
    if (!listingId) return res.status(400).json({ error: 'Choose a valid listing' });
    const [[listing]] = await pool.query('SELECT id FROM listings WHERE id=? AND status="published" AND deleted_at IS NULL', [listingId]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    await pool.execute('INSERT IGNORE INTO saved_listings (user_id, listing_id) VALUES (?, ?)', [req.session.user.id, listingId]);
    res.status(201).json({ saved: true });
  } catch (error) { next(error); }
});

app.delete('/api/listings/:id/save', requireAuth, async (req, res, next) => {
  try {
    const listingId = positiveId(req.params.id);
    if (!listingId) return res.status(400).json({ error: 'Choose a valid listing' });
    await pool.execute('DELETE FROM saved_listings WHERE user_id=? AND listing_id=?', [req.session.user.id, listingId]);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/account/saved-listings', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const [listings] = await pool.execute(
      `SELECT l.id, l.title, l.city, l.neighborhood, l.currency, l.nightly_price nightlyPrice,
        l.monthly_price monthlyPrice, l.yearly_price yearlyPrice, l.average_rating rating, l.review_count reviewCount,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl
       FROM saved_listings s JOIN listings l ON l.id=s.listing_id
       WHERE s.user_id=? AND l.deleted_at IS NULL ORDER BY s.created_at DESC`,
      [req.session.user.id]
    );
    res.json({ listings });
  } catch (error) { next(error); }
});

app.get('/api/account/search-alerts', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const [alerts] = await pool.execute('SELECT id, name, filters, frequency, is_active active, created_at createdAt FROM search_alerts WHERE user_id=? ORDER BY created_at DESC', [req.session.user.id]);
    res.json({ alerts });
  } catch (error) { next(error); }
});

app.delete('/api/search-alerts/:id', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM search_alerts WHERE id=? AND user_id=?', [req.params.id, req.session.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Search alert not found' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/listings/:id/details', async (req, res, next) => {
  try {
    const [[listing]] = await pool.query(
      `SELECT l.id, l.title, l.description, l.address_line1 address, l.neighborhood, l.city, l.region, l.latitude, l.longitude,
        l.currency, l.nightly_price nightlyPrice, l.monthly_price monthlyPrice, l.yearly_price yearlyPrice,
        l.average_rating rating, l.review_count reviewCount, l.bedrooms, l.bathrooms,
        l.agent_user_id agentId, ap.agency_name agencyName, p.first_name firstName, p.last_name lastName,
        ap.profile_image_url profileImageUrl, ap.followers_count followers,
        (SELECT AVG(TIMESTAMPDIFF(MINUTE, b.created_at, b.confirmed_at))/60 FROM bookings b WHERE b.host_user_id=l.agent_user_id AND b.confirmed_at IS NOT NULL) responseHours,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl,
        EXISTS(SELECT 1 FROM saved_listings s WHERE s.user_id=? AND s.listing_id=l.id) saved
       FROM listings l LEFT JOIN agent_profiles ap ON ap.user_id=l.agent_user_id
       LEFT JOIN user_profiles p ON p.user_id=l.agent_user_id
       WHERE l.id=? AND l.status="published" AND l.deleted_at IS NULL`,
      [req.session.user?.id || 0, req.params.id]
    );
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const [reviews] = await pool.query(
      `SELECT r.rating, r.comment, r.created_at createdAt, p.first_name firstName, p.last_name lastName
       FROM reviews r JOIN user_profiles p ON p.user_id=r.author_user_id
       WHERE r.listing_id=? AND r.status="published" ORDER BY r.created_at DESC LIMIT 20`,
      [req.params.id]
    );
    const [similar] = await pool.query(
      `SELECT l.id, l.title, l.city, l.currency, l.nightly_price nightlyPrice, l.monthly_price monthlyPrice,
        l.average_rating rating, l.review_count reviewCount,
        (SELECT lm.public_url FROM listing_media lm WHERE lm.listing_id=l.id ORDER BY lm.is_cover DESC, lm.sort_order ASC LIMIT 1) coverUrl
       FROM listings l WHERE l.status="published" AND l.deleted_at IS NULL AND l.id<>?
       AND (l.city=? OR l.neighborhood=? OR l.agent_user_id=?) ORDER BY l.average_rating DESC, l.updated_at DESC LIMIT 6`,
      [req.params.id, listing.city, listing.neighborhood, listing.agentId]
    );
    res.json({ listing, reviews, similar });
  } catch (error) { next(error); }
});

app.patch('/api/account/notification-preferences', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const keys = ['saved_searches', 'price_drops', 'booking_updates', 'messages', 'followed_agents', 'marketing'];
    const values = keys.map(key => req.body[key] === true ? 1 : 0);
    await pool.execute(
      `INSERT INTO user_notification_preferences (user_id, ${keys.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ${keys.map(key => `${key}=VALUES(${key})`).join(', ')}`,
      [req.session.user.id, ...values]
    );
    res.json({ ok: true, preferences: Object.fromEntries(keys.map((key, index) => [key, Boolean(values[index])])) });
  } catch (error) { next(error); }
});

app.get('/api/account/notification-preferences', requireAuth, requireRole('tenant'), async (req, res, next) => {
  try {
    const [[preferences]] = await pool.query('SELECT saved_searches, price_drops, booking_updates, messages, followed_agents, marketing FROM user_notification_preferences WHERE user_id=?', [req.session.user.id]);
    res.json({ preferences: preferences || { saved_searches: 1, price_drops: 1, booking_updates: 1, messages: 1, followed_agents: 1, marketing: 0 } });
  } catch (error) { next(error); }
});

app.post('/api/account/change-password', requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const password = String(req.body.password || '');
    if (password.length < 12) return res.status(400).json({ error: 'Password must be at least 12 characters' });
    const [[user]] = await pool.query('SELECT password_hash passwordHash FROM users WHERE id=?', [req.session.user.id]);
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ error: 'Current password is incorrect' });
    await pool.execute('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(password, 12), req.session.user.id]);
    await audit(req, 'password_changed', 'user', req.session.user.id);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.delete('/api/account', requireAuth, async (req, res, next) => {
  try {
    const [[user]] = await pool.query('SELECT password_hash passwordHash FROM users WHERE id=?', [req.session.user.id]);
    if (!user?.passwordHash || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return res.status(400).json({ error: 'Password is required to delete your account' });
    await pool.execute('INSERT INTO account_deletion_requests (user_id, reason) VALUES (?, ?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)', [req.session.user.id, String(req.body.reason || '').slice(0, 500) || null]);
    await audit(req, 'account_deletion_requested', 'user', req.session.user.id);
    req.session.destroy(() => res.json({ ok: true }));
  } catch (error) { next(error); }
});

app.post('/api/search-alerts', requireAuth, async (req, res, next) => {
  try {
    const { name, filters, frequency = 'daily' } = req.body;
    if (!name || !filters || !['instant', 'daily', 'weekly'].includes(frequency)) return res.status(400).json({ error: 'Alert name, filters, and valid frequency are required' });
    const [result] = await pool.execute('INSERT INTO search_alerts (user_id, name, filters, frequency) VALUES (?, ?, ?, ?)', [req.session.user.id, name, JSON.stringify(filters), frequency]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { next(error); }
});

app.post('/api/listings/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be from 1 to 5' });
    const [eligible] = await pool.execute('SELECT id FROM bookings WHERE id=? AND guest_user_id=? AND listing_id=? AND status="completed"', [req.body.bookingId, req.session.user.id, req.params.id]);
    if (!eligible.length) return res.status(403).json({ error: 'A completed booking is required to review this listing' });
    const [result] = await pool.execute('INSERT INTO reviews (booking_id, author_user_id, listing_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [req.body.bookingId, req.session.user.id, req.params.id, rating, String(req.body.comment || '').slice(0, 5000)]);
    await pool.execute('UPDATE listings SET average_rating=(SELECT AVG(rating) FROM reviews WHERE listing_id=? AND status="published"), review_count=(SELECT COUNT(*) FROM reviews WHERE listing_id=? AND status="published") WHERE id=?', [req.params.id, req.params.id, req.params.id]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { next(error); }
});

app.post('/api/listings/:id/geocode', requireAuth, requireHostRole, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, address_line1, neighborhood, city, region, country_code FROM listings WHERE id=? AND (owner_user_id=? OR agent_user_id=?)', [req.params.id, req.session.user.id, req.session.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Listing not found' });
    const listing = rows[0];
    const result = await geocodeAddress([listing.address_line1, listing.neighborhood, listing.city, listing.region, listing.country_code].filter(Boolean).join(', '));
    if (!result) return res.status(404).json({ error: 'Address could not be geocoded' });
    await pool.execute('UPDATE listings SET latitude=?, longitude=?, approximate_latitude=?, approximate_longitude=? WHERE id=?', [result.latitude, result.longitude, result.latitude, result.longitude, req.params.id]);
    await audit(req, 'listing_geocoded', 'listing', req.params.id, { provider: 'nominatim' });
    res.json(result);
  } catch (error) { next(error); }
});

app.post('/api/auth/mfa/setup', requireAuth, (req, res) => {
  const secret = generateSecret();
  req.session.mfaSecret = secret;
  res.json({ secret, otpauth: generateURI({ issuer: 'StayNest', label: String(req.session.user.id), secret }) });
});

app.post('/api/auth/mfa/enable', requireAuth, async (req, res, next) => {
  try {
    if (!req.session.mfaSecret || !(await verify({ token: req.body.code, secret: req.session.mfaSecret })).valid) return res.status(400).json({ error: 'Invalid MFA code' });
    await pool.execute('UPDATE users SET mfa_enabled=TRUE, mfa_secret_encrypted=? WHERE id=?', [encryptSecret(req.session.mfaSecret), req.session.user.id]);
    delete req.session.mfaSecret;
    res.json({ ok: true });
  } catch (error) { next(error); }
});

async function audit(req, action, entityType, entityId, metadata = {}) {
  await pool.execute(
    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, ip_address, user_agent, metadata) VALUES (?, ?, ?, ?, INET6_ATON(?), ?, ?)',
    [req.session.user?.id || null, action, entityType, entityId || null, req.ip, req.get('user-agent') || null, JSON.stringify(metadata)]
  );
}

app.post('/api/admin/gate', adminGateLimiter, async (req, res, next) => {
  try {
    if (!(await adminIpAllowed(req.ip))) return res.status(403).json({ error: 'This administrator network is not allowed' });
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const expectedUsername = String(process.env.ADMIN_GATE_USERNAME || '');
    const passwordHash = String(process.env.ADMIN_GATE_PASSWORD_HASH || '');
    if (!expectedUsername || !passwordHash || username.length > 120 || password.length > 200 || username !== expectedUsername || !(await bcrypt.compare(password, passwordHash))) {
      return res.status(401).json({ error: 'Invalid administrator credentials' });
    }
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.adminGate = true;
    req.session.user = {
      id: null,
      firstName: 'Kado',
      lastName: 'Administrator',
      roles: ['administrator'],
      permissions: []
    };
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    res.json({ ok: true, redirect: '/admin.html' });
  } catch (error) { next(error); }
});

app.get('/api/admin/settings', requireAuth, requireAdminAccess, async (_req, res, next) => {
  try {
    const [settings, features, templates, rules] = await Promise.all([
      pool.query('SELECT setting_key, setting_value, updated_at FROM app_settings').then(([rows]) => rows),
      pool.query('SELECT feature_key, enabled, description, updated_at FROM feature_flags ORDER BY feature_key').then(([rows]) => rows),
      pool.query('SELECT template_key, subject, body, updated_at FROM email_templates ORDER BY template_key').then(([rows]) => rows),
      pool.query('SELECT id, rule_type, cidr, label, enabled, created_at FROM admin_ip_rules ORDER BY created_at DESC').then(([rows]) => rows)
    ]);
    res.json({ settings, features, templates, rules });
  } catch (error) { next(error); }
});

app.get('/api/admin/analytics', requireAuth, requireAdminAccess, async (_req, res, next) => {
  try {
    res.json(await getGa4Analytics());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/settings', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const values = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : {};
    const allowed = Object.keys(adminSettingKeys);
    for (const key of allowed) {
      if (values[key] === undefined) continue;
      const value = key === 'maintenance_mode' ? (values[key] ? '1' : '0') : String(values[key]).trim().slice(0, 5000);
      if (key === 'site_name' && (!value || value.length > 120)) return res.status(400).json({ error: 'Site name is required and must be shorter than 120 characters' });
      await pool.execute('INSERT INTO app_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_by=VALUES(updated_by)', [key, value, req.session.user.id || null]);
    }
    await loadRuntimeConfig();
    await audit(req, 'admin_settings_updated', 'app_settings', null, { keys: Object.keys(values).filter(key => allowed.includes(key)) });
    res.json({ ok: true, config: runtimeConfig });
  } catch (error) { next(error); }
});

app.patch('/api/admin/features/:featureKey', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const key = String(req.params.featureKey || '').trim().slice(0, 80);
    if (!/^[a-z0-9_]+$/.test(key)) return res.status(400).json({ error: 'Invalid feature key' });
    await pool.execute('UPDATE feature_flags SET enabled=?, updated_by=? WHERE feature_key=?', [req.body.enabled ? 1 : 0, req.session.user.id || null, key]);
    const [[feature]] = await pool.query('SELECT feature_key, enabled FROM feature_flags WHERE feature_key=?', [key]);
    if (!feature) return res.status(404).json({ error: 'Feature flag not found' });
    await audit(req, 'feature_flag_updated', 'feature_flag', null, { featureKey: key, enabled: Boolean(feature.enabled) });
    res.json({ ok: true, feature });
  } catch (error) { next(error); }
});

app.patch('/api/admin/email-templates/:templateKey', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const key = String(req.params.templateKey || '').trim().slice(0, 80);
    const subject = String(req.body.subject || '').trim().slice(0, 255);
    const body = String(req.body.body || '').trim().slice(0, 20000);
    if (!/^[a-z0-9_.-]+$/.test(key) || !subject || !body) return res.status(400).json({ error: 'Template key, subject, and body are required' });
    await pool.execute('INSERT INTO email_templates (template_key, subject, body, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject=VALUES(subject), body=VALUES(body), updated_by=VALUES(updated_by)', [key, subject, body, req.session.user.id || null]);
    await audit(req, 'email_template_updated', 'email_template', null, { templateKey: key });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post('/api/admin/ip-rules', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const type = ['allow', 'deny'].includes(req.body.ruleType) ? req.body.ruleType : null;
    const cidr = String(req.body.cidr || '').trim().slice(0, 64);
    const label = String(req.body.label || '').trim().slice(0, 120) || null;
    if (!type || !/^[0-9a-f:.]+(?:\/\d{1,3})?$/i.test(cidr)) return res.status(400).json({ error: 'Enter a valid IP address or CIDR range' });
    await pool.execute('INSERT INTO admin_ip_rules (rule_type, cidr, label, created_by) VALUES (?, ?, ?, ?)', [type, cidr, label, req.session.user.id || null]);
    await audit(req, 'admin_ip_rule_created', 'admin_ip_rule', null, { type, cidr });
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That IP rule already exists' });
    next(error);
  }
});

app.delete('/api/admin/ip-rules/:id', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM admin_ip_rules WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'IP rule not found' });
    await audit(req, 'admin_ip_rule_deleted', 'admin_ip_rule', req.params.id);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.post('/api/admin/admins', requireAuth, requireAdminAccess, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const confirmationPassword = String(req.body.confirmationPassword || '');
    const password = String(req.body.password || '');
    const email = String(req.body.email || '').trim().toLowerCase();
    const firstName = String(req.body.firstName || '').trim().slice(0, 80);
    const lastName = String(req.body.lastName || '').trim().slice(0, 80);
    if (!process.env.ADMIN_GATE_PASSWORD_HASH || !(await bcrypt.compare(confirmationPassword, process.env.ADMIN_GATE_PASSWORD_HASH))) return res.status(403).json({ error: 'Enter your administrator password to confirm this change' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !firstName || !lastName || !strongPassword(password)) return res.status(400).json({ error: 'Provide a valid name, email, and strong password' });
    await connection.beginTransaction();
    const [result] = await connection.execute('INSERT INTO users (email, password_hash, status, email_verified_at) VALUES (?, ?, "active", UTC_TIMESTAMP())', [email, await bcrypt.hash(password, 12)]);
    await connection.execute('INSERT INTO user_profiles (user_id, first_name, last_name, avatar_url) VALUES (?, ?, ?, ?)', [result.insertId, firstName, lastName, DEFAULT_PROFILE_AVATAR]);
    await connection.execute('INSERT INTO user_roles (user_id, role_id, assigned_by) SELECT ?, id, ? FROM roles WHERE name="administrator"', [result.insertId, req.session.impersonator?.id || null]);
    await connection.commit();
    await audit(req, 'administrator_created', 'user', result.insertId, { email });
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists' });
    next(error);
  } finally { connection.release(); }
});

app.get('/api/admin/announcements', requireAuth, requireAdminAccess, async (_req, res, next) => {
  try { const [announcements] = await pool.query('SELECT id, title, body, audience, status, scheduled_for, published_at, created_at FROM announcements ORDER BY created_at DESC LIMIT 100'); res.json({ announcements }); } catch (error) { next(error); }
});

app.post('/api/admin/announcements', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim().slice(0, 180);
    const body = String(req.body.body || '').trim().slice(0, 5000);
    const audience = ['all', 'tenants', 'agents', 'administrators'].includes(req.body.audience) ? req.body.audience : 'all';
    const publishNow = req.body.publishNow === true;
    if (!title || !body) return res.status(400).json({ error: 'Announcement title and message are required' });
    const [result] = await pool.execute('INSERT INTO announcements (title, body, audience, status, scheduled_for, published_at, created_by) VALUES (?, ?, ?, ?, ?, IF(?="published", UTC_TIMESTAMP(), NULL), ?)', [title, body, audience, publishNow ? 'published' : 'scheduled', publishNow ? new Date() : req.body.scheduledFor || null, publishNow ? 'published' : 'scheduled', req.session.user.id || null]);
    if (publishNow) await deliverAnnouncement(result.insertId, title, body, audience);
    await audit(req, publishNow ? 'announcement_published' : 'announcement_scheduled', 'announcement', result.insertId, { audience });
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (error) { next(error); }
});

async function deliverAnnouncement(id, title, body, audience) {
  const roleClause = audience === 'all' ? '' : 'JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id AND r.name=?';
  const params = audience === 'all' ? [] : [audience.slice(0, -1)];
  const [users] = await pool.query(`SELECT DISTINCT u.id FROM users u ${roleClause} WHERE u.status='active'`, params);
  await Promise.all(users.map(user => notifyUser(user.id, { type: 'announcement', title, body, data: { announcementId: id } })));
}

app.get('/api/admin/insights', requireAuth, requireAdminAccess, async (_req, res, next) => {
  try {
    const [[summary]] = await pool.query(`SELECT (SELECT COUNT(*) FROM users WHERE created_at>=UTC_DATE()) newUsersToday, (SELECT COUNT(*) FROM users WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 30 DAY)) newUsers30Days, (SELECT COUNT(*) FROM bookings WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 30 DAY)) bookings30Days, (SELECT COUNT(*) FROM listings WHERE status='published') publishedListings`);
    const [security] = await pool.query(`SELECT event_type, COUNT(*) count FROM security_events WHERE created_at>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 HOUR) GROUP BY event_type`);
    res.json({ summary, security });
  } catch (error) { next(error); }
});

app.post('/api/admin/users/:id/impersonate', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const [[target]] = await pool.query('SELECT u.id, p.first_name firstName, p.last_name lastName, GROUP_CONCAT(r.name) roles FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND u.status="active" GROUP BY u.id', [req.params.id]);
    if (!target || Number(target.id) === Number(req.session.user.id)) return res.status(404).json({ error: 'Active user not found' });
    const administrator = { id: req.session.user.id, firstName: req.session.user.firstName, lastName: req.session.user.lastName, roles: ['administrator'] };
    await audit(req, 'admin_impersonation_started', 'user', target.id, { administratorId: administrator.id });
    req.session.impersonator = administrator;
    req.session.user = { id: target.id, firstName: target.firstName || '', lastName: target.lastName || '', roles: target.roles ? target.roles.split(',') : [] };
    res.json({ ok: true, redirect: '/' });
  } catch (error) { next(error); }
});

app.post('/api/admin/impersonation/stop', requireAuth, async (req, res, next) => {
  try {
    if (!req.session.impersonator) return res.status(400).json({ error: 'No impersonation session is active' });
    const administrator = req.session.impersonator;
    req.session.user = administrator;
    delete req.session.impersonator;
    res.json({ ok: true, redirect: '/admin.html' });
  } catch (error) { next(error); }
});

app.get('/api/admin/overview', requireAuth, requireAdminAccess, async (_req, res, next) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status <> 'deleted') totalUsers,
        (SELECT COUNT(*) FROM users WHERE status='active') activeUsers,
        (SELECT COUNT(*) FROM users WHERE status='suspended') suspendedUsers,
        (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.name='agent' AND u.status='active') activeAgents,
        (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.name='tenant' AND u.status='active') activeTenants,
        (SELECT COUNT(*) FROM agent_subaccounts sa JOIN users u ON u.id=sa.subagent_user_id WHERE sa.status='active' AND u.status='active') activeSubagents,
        (SELECT COUNT(*) FROM listings WHERE status='published') activeListings,
        (SELECT COUNT(*) FROM listings WHERE status IN ('pending_review','draft')) listingsNeedingReview,
        (SELECT COUNT(*) FROM identity_verifications WHERE status='pending') pendingVerifications,
        (SELECT COUNT(*) FROM bookings WHERE status='pending') pendingBookings,
        (SELECT COUNT(*) FROM notifications WHERE read_at IS NULL) unreadNotifications,
        (SELECT COUNT(*) FROM bookings WHERE created_at >= UTC_DATE()) todaysBookings,
        (SELECT COALESCE(SUM(total_amount),0) FROM bookings WHERE status IN ('confirmed','completed')) grossBookingVolume,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at >= UTC_DATE()) todaysAuditEvents
    `);
    res.json(stats);
  } catch (error) { next(error); }
});

app.get('/api/admin/users', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    const status = ['pending', 'active', 'suspended', 'deleted'].includes(req.query.status) ? req.query.status : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const params = [];
    const where = [];
    if (query) {
      where.push('(u.email LIKE ? OR u.phone LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)');
      const term = `%${query}%`;
      params.push(term, term, term, term);
    }
    if (status) { where.push('u.status=?'); params.push(status); }
    params.push(limit);
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.phone, u.status, u.mfa_enabled, u.email_verified_at, u.last_login_at, u.created_at,
             p.first_name, p.last_name, COALESCE(GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', '), '') roles
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id=u.id
      LEFT JOIN user_roles ur ON ur.user_id=u.id
      LEFT JOIN roles r ON r.id=ur.role_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ?
    `, params);
    res.json({ users });
  } catch (error) { next(error); }
});

app.get('/api/admin/listings', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    const status = ['draft', 'pending_review', 'published', 'unpublished', 'rejected', 'archived'].includes(req.query.status) ? req.query.status : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const params = [];
    const where = [];
    if (query) { where.push('(l.title LIKE ? OR l.city LIKE ? OR l.neighborhood LIKE ?)'); const term = `%${query}%`; params.push(term, term, term); }
    if (status) { where.push('l.status=?'); params.push(status); }
    const sortMap = { recent: 'l.updated_at DESC', oldest: 'l.created_at ASC', title: 'l.title ASC', status: 'l.status ASC' };
    const sort = sortMap[String(req.query.sort)] || 'l.updated_at DESC';
    params.push(limit);
    const [listings] = await pool.query(`
      SELECT l.id, l.title, l.city, l.status, l.currency, l.nightly_price, l.monthly_price,
             l.created_at, l.updated_at, u.id owner_id, COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name), u.email) owner_name
      FROM listings l
      JOIN users u ON u.id=l.owner_user_id
      LEFT JOIN user_profiles p ON p.user_id=u.id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${sort}
      LIMIT ?
    `, params);
    res.json({ listings });
  } catch (error) { next(error); }
});

app.get('/api/admin/posts', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const status = ['draft','pending_review','published','unpublished','rejected','archived'].includes(req.query.status) ? req.query.status : null;
    const sortMap = { recent: 'l.created_at DESC', oldest: 'l.created_at ASC', title: 'l.title ASC', engagement: 'engagement DESC' };
    const sort = sortMap[String(req.query.sort)] || 'l.created_at DESC';
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const params = [];
    const where = [];
    if (status) { where.push('l.status=?'); params.push(status); }
    if (req.query.q) { where.push('(l.title LIKE ? OR l.city LIKE ? OR CONCAT(p.first_name," ",p.last_name) LIKE ?)'); const q=`%${String(req.query.q).slice(0,100)}%`; params.push(q,q,q); }
    params.push(limit);
    const [posts] = await pool.query(
      `SELECT l.id,l.title,l.city,l.status,l.created_at,l.updated_at,
        COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) agent_name,
        COALESCE(lk.likes,0) likes,COALESCE(vw.views,0) views,
        (COALESCE(lk.likes,0)*3+COALESCE(vw.views,0)) engagement
       FROM listings l JOIN users u ON u.id=l.agent_user_id
       LEFT JOIN user_profiles p ON p.user_id=u.id
       LEFT JOIN (SELECT listing_id,COUNT(*) likes FROM listing_likes GROUP BY listing_id) lk ON lk.listing_id=l.id
       LEFT JOIN (SELECT listing_id,COUNT(*) views FROM listing_views GROUP BY listing_id) vw ON vw.listing_id=l.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${sort} LIMIT ?`, params);
    res.json({ posts });
  } catch (error) { next(error); }
});

app.get('/api/admin/agents', requireAuth, requireAdminAccess, async (_req, res, next) => {
  try {
    const [agents] = await pool.query(`SELECT u.id,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name,
      u.email,ab.badge_label badgeLabel,ab.expires_at badgeExpiresAt
      FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      LEFT JOIN user_profiles p ON p.user_id=u.id
      LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP())
      WHERE r.name='agent' AND u.status='active' ORDER BY name`);
    res.json({ agents });
  } catch (error) { next(error); }
});

app.post('/api/admin/agents/:id/badge', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const duration = String(req.body.duration || '30');
    const days = duration === 'forever' ? null : Number(duration);
    if (days !== null && ![7,30,90,365].includes(days)) return res.status(400).json({ error: 'Choose a supported badge duration' });
    const label = String(req.body.label || 'Featured agent').trim().slice(0,80) || 'Featured agent';
    const [[agent]] = await pool.query(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND r.name='agent' AND u.status='active'`, [req.params.id]);
    if (!agent) return res.status(404).json({ error: 'Active agent not found' });
    await pool.execute('UPDATE agent_badges SET expires_at=UTC_TIMESTAMP() WHERE agent_user_id=? AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP())', [agent.id]);
    await pool.execute('INSERT INTO agent_badges (agent_user_id,badge_label,starts_at,expires_at,assigned_by) VALUES (?, ?, UTC_TIMESTAMP(), ?, ?)', [agent.id,label,days === null ? null : new Date(Date.now()+days*86400000),req.session.user.id || null]);
    await audit(req, 'agent_badge_assigned', 'user', agent.id, { label, duration });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/admin/bookings', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const status = ['pending', 'payment_pending', 'confirmed', 'completed', 'cancelled', 'declined'].includes(req.query.status) ? req.query.status : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const params = [];
    const where = [];
    if (status) { where.push('b.status=?'); params.push(status); }
    params.push(limit);
    const [bookings] = await pool.query(`
      SELECT b.id, b.booking_code, b.check_in, b.check_out, b.guests, b.currency, b.total_amount, b.status, b.created_at,
             l.title, guest.id guest_id, COALESCE(gp.display_name, CONCAT(gp.first_name, ' ', gp.last_name), guest.email) guest_name,
             host.id host_id, COALESCE(hp.display_name, CONCAT(hp.first_name, ' ', hp.last_name), host.email) host_name
      FROM bookings b
      JOIN listings l ON l.id=b.listing_id
      JOIN users guest ON guest.id=b.guest_user_id
      LEFT JOIN user_profiles gp ON gp.user_id=guest.id
      LEFT JOIN users host ON host.id=b.host_user_id
      LEFT JOIN user_profiles hp ON hp.user_id=host.id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY b.created_at DESC
      LIMIT ?
    `, params);
    res.json({ bookings });
  } catch (error) { next(error); }
});

app.get('/api/admin/verifications', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const status = ['pending', 'approved', 'rejected', 'expired'].includes(req.query.status) ? req.query.status : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const params = [];
    const where = [];
    if (status) { where.push('v.status=?'); params.push(status); }
    params.push(limit);
    const [verifications] = await pool.query(`
      SELECT v.id, v.document_type, v.document_last4, v.status, v.created_at,
             u.email, COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name), u.email) applicant_name
      FROM identity_verifications v
      JOIN users u ON u.id=v.user_id
      LEFT JOIN user_profiles p ON p.user_id=u.id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY v.created_at DESC
      LIMIT ?
    `, params);
    res.json({ verifications });
  } catch (error) { next(error); }
});

app.get('/api/admin/agent-verifications', requireAuth, requireAdminAccess, async (_req, res, next) => {
  try {
    const [registrations] = await pool.query(`
      SELECT u.id, 'agent' verification_type,
             CASE WHEN u.status='active' THEN 'approved' WHEN u.status='suspended' THEN 'rejected' ELSE u.status END verification_status,
             u.status, u.email, u.phone, p.city, p.avatar_url avatarUrl, u.created_at,
             p.first_name, p.last_name, NULL main_agent_id, NULL main_agent_name, NULL main_agent_email, NULL main_agent_phone,
             NULL main_agent_city, NULL mainAgentAvatar, NULL account_label
      FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      JOIN user_profiles p ON p.user_id=u.id
      WHERE r.name='agent' AND u.status IN ('pending','active','suspended')
    `);
    const [subagents] = await pool.query(`
      SELECT u.id, 'subagent' verification_type,
             CASE WHEN sa.status='active' THEN 'approved' WHEN sa.status='revoked' THEN 'rejected' ELSE sa.status END verification_status,
             u.status, u.email, u.phone, p.city, p.avatar_url avatarUrl, sa.created_at,
             p.first_name, p.last_name, sa.main_agent_user_id main_agent_id,
             mu.email main_agent_email, mu.phone main_agent_phone,
             COALESCE(mp.display_name, CONCAT(mp.first_name, ' ', mp.last_name), mu.email) main_agent_name,
             mp.city main_agent_city, mp.avatar_url mainAgentAvatar,
             sa.label account_label
      FROM agent_subaccounts sa JOIN users u ON u.id=sa.subagent_user_id
      JOIN user_profiles p ON p.user_id=u.id
      JOIN users mu ON mu.id=sa.main_agent_user_id LEFT JOIN user_profiles mp ON mp.user_id=mu.id
      WHERE sa.status IN ('pending','active','revoked')
    `);
    res.json({ verifications: [...registrations, ...subagents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) });
  } catch (error) { next(error); }
});

app.post('/api/admin/agent-verifications/:id/decision', requireAuth, requireAdminAccess, async (req, res, next) => {
  const userId = Number(req.params.id);
  const status = req.body.status === 'approved' ? 'approved' : req.body.status === 'rejected' ? 'rejected' : null;
  if (!Number.isSafeInteger(userId) || userId < 1 || !status) return res.status(400).json({ error: 'Invalid agent verification decision' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[user]] = await connection.query(`
      SELECT u.id, u.email, u.status, p.first_name firstName, p.last_name lastName,
             sa.id subaccount_id, sa.main_agent_user_id mainAgentId, sa.label
      FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      JOIN user_profiles p ON p.user_id=u.id
      LEFT JOIN agent_subaccounts sa ON sa.subagent_user_id=u.id
      WHERE u.id=? AND r.name='agent' AND u.status='pending'
      FOR UPDATE`, [userId]);
    if (!user) { await connection.rollback(); return res.status(404).json({ error: 'Pending agent or sub-agent not found' }); }
    const nextUserStatus = status === 'approved' ? 'active' : 'suspended';
    await connection.execute('UPDATE users SET status=? WHERE id=?', [nextUserStatus, userId]);
    if (user.subaccount_id) await connection.execute('UPDATE agent_subaccounts SET status=? WHERE id=?', [status === 'approved' ? 'active' : 'revoked', user.subaccount_id]);
    await connection.commit();
    await audit(req, `agent_${status}`, user.subaccount_id ? 'agent_subaccount' : 'user', user.subaccount_id || userId);
    if (status === 'approved') {
      void notifyUser(userId, {
        type: user.subaccount_id ? 'subagent_approved' : 'agent_approved',
        title: 'Your StayNest agent account was approved',
        body: 'Founder verification is complete. You can now sign in and use agent features.',
        data: { userId, subaccountId: user.subaccount_id || null }
      }).catch(error => console.error('Agent approval notification failed:', error.message));
    }
    res.json({ ok: true, status });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
});

app.post('/api/admin/users/:id/status', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const status = ['pending', 'active', 'suspended', 'deleted'].includes(req.body.status) ? req.body.status : null;
    const userId = Number(req.params.id);
    if (!status || !Number.isSafeInteger(userId) || userId < 1) return res.status(400).json({ error: 'Invalid user status or ID' });
    if (userId === req.session.user.id && status !== 'active') return res.status(400).json({ error: 'You cannot deactivate your own administrator account' });
    const [result] = await pool.execute('UPDATE users SET status=?, deleted_at=IF(?="deleted", UTC_TIMESTAMP(), NULL) WHERE id=?', [status, status, userId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found' });
    if (status !== 'active') {
      await pool.execute('UPDATE agent_subaccounts SET status=? WHERE subagent_user_id=?', [status === 'deleted' ? 'revoked' : 'suspended', userId]);
      await sessionStore.destroyUserSessions(userId);
    }
    await audit(req, `user_${status}`, 'user', userId, { reason: String(req.body.reason || '') });
    res.json({ ok: true, status });
  } catch (error) { next(error); }
});

app.post('/api/admin/users/:id/mfa/reset', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const userId = positiveId(req.params.id);
    if (!userId) return res.status(400).json({ error: 'Invalid user ID' });
    const [result] = await pool.execute('UPDATE users SET mfa_enabled=FALSE, mfa_secret_encrypted=NULL WHERE id=?', [userId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found' });
    await sessionStore.destroyUserSessions(userId);
    await audit(req, 'user_mfa_reset', 'user', userId);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post('/api/admin/users/:id/email/verify', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const userId = positiveId(req.params.id);
    if (!userId) return res.status(400).json({ error: 'Invalid user ID' });
    const [result] = await pool.execute('UPDATE users SET email_verified_at=COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id=? AND email IS NOT NULL', [userId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found or has no email' });
    await audit(req, 'user_email_verified', 'user', userId);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post('/api/admin/users/:id/role', requireAuth, requireAdminAccess, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const role = ['tenant', 'agent', 'administrator'].includes(req.body.role) ? req.body.role : null;
    const userId = Number(req.params.id);
    if (!role || !Number.isSafeInteger(userId) || userId < 1) return res.status(400).json({ error: 'Invalid role or user ID' });
    await connection.beginTransaction();
    const [roleRows] = await connection.execute('SELECT id FROM roles WHERE name=?', [role]);
    if (!roleRows.length) { await connection.rollback(); return res.status(400).json({ error: 'Role not found' }); }
    const [userRows] = await connection.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!userRows.length) { await connection.rollback(); return res.status(404).json({ error: 'User not found' }); }
    await connection.execute('DELETE ur FROM user_roles ur JOIN roles old_role ON old_role.id=ur.role_id WHERE ur.user_id=? AND old_role.name IN ("tenant","agent")', [userId]);
    await connection.execute('INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)', [userId, roleRows[0].id, req.session.user.id]);
    if (role === 'agent') await connection.execute('INSERT IGNORE INTO agent_profiles (user_id) VALUES (?)', [userId]);
    await connection.commit();
    await audit(req, 'user_role_assigned', 'user', userId, { role });
    void notifyUser(userId, {
      type: 'role_changed',
      title: 'Your StayNest role was changed',
      body: `An administrator changed your account role to ${role}. Your previous role data remains stored securely.`,
      data: { role }
    }).catch(error => console.error('Role change notification failed:', error.message));
    res.json({ ok: true, role });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
});

app.delete('/api/admin/users/:id/role/:role', requireAuth, requireAdminAccess, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = positiveId(req.params.id);
    const role = ['tenant', 'agent', 'administrator'].includes(req.params.role) ? req.params.role : null;
    if (!userId || !role) return res.status(400).json({ error: 'Invalid role or user ID' });
    if (userId === req.session.user.id && role === 'administrator') return res.status(400).json({ error: 'You cannot remove your own administrator role' });
    await connection.beginTransaction();
    const [[roleRow]] = await connection.query('SELECT id FROM roles WHERE name=?', [role]);
    if (!roleRow) {
      await connection.rollback();
      return res.status(400).json({ error: 'Role not found' });
    }
    if (role === 'administrator') {
      const [[count]] = await connection.query(
        `SELECT COUNT(*) count FROM user_roles ur JOIN users u ON u.id=ur.user_id
         WHERE ur.role_id=? AND u.status='active'`,
        [roleRow.id]
      );
      if (Number(count.count) <= 1) {
        await connection.rollback();
        return res.status(400).json({ error: 'The last active administrator cannot be removed' });
      }
    }
    const [result] = await connection.execute('DELETE FROM user_roles WHERE user_id=? AND role_id=?', [userId, roleRow.id]);
    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ error: 'Role assignment not found' });
    }
    await connection.commit();
    await audit(req, 'user_role_removed', 'user', userId, { role });
    if (role === 'administrator') await sessionStore.destroyUserSessions(userId);
    res.json({ ok: true, role });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
});

app.post('/api/admin/bookings/:id/status', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const status = ['confirmed', 'declined', 'cancelled', 'completed'].includes(req.body.status) ? req.body.status : null;
    const bookingId = Number(req.params.id);
    if (!status || !Number.isSafeInteger(bookingId) || bookingId < 1) return res.status(400).json({ error: 'Invalid booking status or ID' });
    const [result] = await pool.execute('UPDATE bookings SET status=?, confirmed_at=IF(?="confirmed", COALESCE(confirmed_at, UTC_TIMESTAMP()), confirmed_at) WHERE id=? AND status NOT IN ("completed","cancelled")', [status, status, bookingId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Booking not found or already finalised' });
    await audit(req, `booking_${status}`, 'booking', bookingId);
    res.json({ ok: true, status });
  } catch (error) { next(error); }
});

app.get('/api/admin/audit-logs', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    const query = String(req.query.q || '').trim().slice(0, 100);
    const action = String(req.query.action || '').trim().slice(0, 80);
    const entityType = String(req.query.entityType || '').trim().slice(0, 60);
    const actorId = positiveId(req.query.actorId);
    const from = String(req.query.from || '').match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
    const to = String(req.query.to || '').match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
    if (query) { const term = `%${query}%`; where.push('(al.action LIKE ? OR al.entity_type LIKE ? OR CAST(al.entity_id AS CHAR) LIKE ? OR COALESCE(p.first_name,"") LIKE ? OR COALESCE(p.last_name,"") LIKE ?)'); params.push(term, term, term, term, term); }
    if (action) { where.push('al.action=?'); params.push(action); }
    if (entityType) { where.push('al.entity_type=?'); params.push(entityType); }
    if (actorId) { where.push('al.actor_user_id=?'); params.push(actorId); }
    if (from) { where.push('al.created_at>=?'); params.push(`${from} 00:00:00`); }
    if (to) { where.push('al.created_at<?'); params.push(`${to} 00:00:00`); const end = new Date(`${to}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1); params[params.length - 1] = end.toISOString().slice(0, 19).replace('T', ' '); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[count]] = await pool.query(`SELECT COUNT(*) total FROM audit_logs al LEFT JOIN user_profiles p ON p.user_id=al.actor_user_id ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT al.id, al.actor_user_id, COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name), CASE WHEN al.actor_user_id IS NULL THEN 'system' ELSE CONCAT('user #', al.actor_user_id) END) actor_name,
        al.action, al.entity_type, al.entity_id, INET6_NTOA(al.ip_address) ip_address, al.user_agent, al.metadata, al.created_at
       FROM audit_logs al LEFT JOIN user_profiles p ON p.user_id=al.actor_user_id
       ${clause} ORDER BY al.created_at DESC, al.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ logs: rows, page, limit, total: Number(count.total), pages: Math.ceil(Number(count.total) / limit) });
  } catch (error) { next(error); }
});

app.post('/api/admin/listings/:id/moderation', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const status = ['published', 'rejected', 'unpublished'].includes(req.body.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ error: 'Invalid listing moderation status' });
    const [[listing]] = await pool.query('SELECT id, title, agent_user_id, owner_user_id FROM listings WHERE id=? AND status != "archived"', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const [result] = await pool.execute('UPDATE listings SET status=?, published_at=IF(?="published", COALESCE(published_at, UTC_TIMESTAMP()), published_at) WHERE id=? AND status != "archived"', [status, status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Listing not found' });
    await audit(req, `listing_${status}`, 'listing', req.params.id, { reason: String(req.body.reason || '') });
    const recipient = listing.agent_user_id || listing.owner_user_id;
    void notifyUser(recipient, {
      type: `listing_${status}`,
      title: status === 'published' ? 'Listing approved' : status === 'rejected' ? 'Listing rejected' : 'Listing unpublished',
      body: `"${listing.title}" was ${status === 'published' ? 'approved and published' : status}.`,
      data: { listingId: listing.id, status }
    }).catch(error => console.error('Listing moderation notification failed:', error.message));
    res.json({ ok: true, status });
  } catch (error) { next(error); }
});

app.post('/api/admin/verifications/:id/decision', requireAuth, requireAdminAccess, async (req, res, next) => {
  try {
    const status = req.body.status === 'approved' ? 'approved' : req.body.status === 'rejected' ? 'rejected' : null;
    if (!status) return res.status(400).json({ error: 'Invalid verification decision' });
    const [result] = await pool.execute('UPDATE identity_verifications SET status=?, reviewed_by=?, reviewed_at=UTC_TIMESTAMP(), rejection_reason=? WHERE id=? AND status="pending"', [status, req.session.user.id, status === 'rejected' ? String(req.body.reason || 'Not approved') : null, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Verification not found' });
    await audit(req, `verification_${status}`, 'identity_verification', req.params.id);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post('/api/listings/:id/media', requireAuth, requireAgentAccess('media.manage'), upload.array('images', 10), async (req, res, next) => {
  try {
    const [owned] = await pool.execute('SELECT id FROM listings WHERE id=? AND (owner_user_id=? OR agent_user_id=?)', [req.params.id, req.session.user.id, req.session.user.id]);
    if (!owned.length) return res.status(404).json({ error: 'Listing not found' });
    const uploaded = [];
    for (const file of req.files) {
      const result = await storeListingImage(file, req.params.id);
      await pool.execute('INSERT INTO listing_media (listing_id, media_type, storage_key, public_url) VALUES (?, "image", ?, ?)', [req.params.id, result.key, result.url]);
      uploaded.push(result);
    }
    await audit(req, 'listing_media_uploaded', 'listing', req.params.id, { count: uploaded.length });
    res.status(201).json({ files: uploaded });
  } catch (error) { next(error); }
});

app.post('/api/identity-documents', requireAuth, requireAgentAccess('identity.manage'), multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype))
}).single('document'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A PDF, JPEG, or PNG document is required' });
    const { documentType, documentCountry, documentLast4 } = req.body;
    if (!['national_id', 'passport', 'drivers_license', 'business_license'].includes(documentType)) return res.status(400).json({ error: 'Invalid document type' });
    if (documentLast4 && !/^\d{4}$/.test(documentLast4)) return res.status(400).json({ error: 'Document suffix must contain four digits' });
    const stored = await storePrivateDocument(req.file, req.session.user.id);
    const [result] = await pool.execute(
      'INSERT INTO identity_verifications (user_id, document_type, document_country, document_last4, document_file_key) VALUES (?, ?, ?, ?, ?)',
      [req.session.user.id, documentType, documentCountry || null, documentLast4 || null, stored.key]
    );
    await audit(req, 'identity_document_uploaded', 'identity_verification', result.insertId);
    res.status(201).json({ id: result.insertId, status: 'pending' });
  } catch (error) { next(error); }
});

app.post('/api/bookings', requireAuth, requireRole('tenant'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    if (!(await isFeatureEnabled('bookings'))) return res.status(503).json({ error: 'Booking requests are temporarily paused' });
    const { listingId, checkIn, checkOut, guests = 1, bookingKind = 'stay', appointmentAt = null } = req.body;
    const validListingId = positiveId(listingId);
    const idempotencyKey = req.get('idempotency-key')?.trim();
    if (!validListingId || !['stay', 'viewing'].includes(bookingKind) || !isValidDate(checkIn) || !isValidDate(checkOut) || !Number.isSafeInteger(Number(guests)) || Number(guests) < 1 || Number(guests) > 100) {
      return res.status(400).json({ error: 'Invalid listing, dates, or guest count' });
    }
    if (idempotencyKey && !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return res.status(400).json({ error: 'Invalid idempotency key' });
    await connection.beginTransaction();
    if (idempotencyKey) {
      const [prior] = await connection.execute('SELECT response_json FROM request_idempotency WHERE user_id=? AND idempotency_key=? FOR UPDATE', [req.session.user.id, idempotencyKey]);
      if (prior[0]) {
        await connection.rollback();
        return res.status(200).json(JSON.parse(prior[0].response_json));
      }
    }
    const [listingRows] = await connection.execute('SELECT id, owner_user_id, agent_user_id, title, currency, nightly_price, cleaning_fee, min_stay_nights FROM listings WHERE id=? AND status="published" FOR UPDATE', [validListingId]);
    const listing = listingRows[0];
    if (!listing) {
      await connection.rollback();
      return res.status(404).json({ error: 'Listing not found' });
    }
    const [overlaps] = await connection.execute('SELECT id FROM bookings WHERE listing_id=? AND status IN ("pending","payment_pending","confirmed") AND check_in < ? AND check_out > ? FOR UPDATE', [listingId, checkOut, checkIn]);
    if (overlaps.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Those dates are no longer available' });
    }
    let booking;
    try {
      booking = calculateBooking({ nightlyPrice: listing.nightly_price || 0, cleaningFee: listing.cleaning_fee || 0, checkIn, checkOut, minimumNights: listing.min_stay_nights });
    } catch {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid dates or minimum stay not met' });
    }
    const bookingCode = `SN${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const { nights, subtotal, total } = booking;
    const bookingHost = listing.agent_user_id || listing.owner_user_id;
    const [result] = await connection.execute('INSERT INTO bookings (booking_code, listing_id, guest_user_id, host_user_id, booking_kind, appointment_at, check_in, check_out, guests, currency, nightly_rate, nights, subtotal, cleaning_fee, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending")', [bookingCode, validListingId, req.session.user.id, bookingHost, bookingKind, appointmentAt || null, checkIn, checkOut, guests, listing.currency, listing.nightly_price || 0, nights, subtotal, listing.cleaning_fee || 0, total]);
    for (let date = new Date(`${checkIn}T00:00:00Z`); date < new Date(`${checkOut}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
      await connection.execute('INSERT INTO booking_date_locks (listing_id, stay_date, booking_id, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE))', [validListingId, date.toISOString().slice(0, 10), result.insertId]);
    }
    const response = { bookingId: result.insertId, bookingCode, amount: total };
    if (idempotencyKey) await connection.execute('INSERT INTO request_idempotency (user_id, idempotency_key, response_json) VALUES (?, ?, ?)', [req.session.user.id, idempotencyKey, JSON.stringify(response)]);
    await connection.commit();
    await audit(req, 'booking_created', 'booking', result.insertId, { listingId: validListingId });
    void notifyUser(bookingHost, {
      type: 'booking_request',
      title: 'New booking request',
      body: `New request for ${listing.title || 'your listing'} from ${checkIn} to ${checkOut}.`,
      data: { bookingId: result.insertId, listingId }
    }).catch(error => console.error('Agent booking notification failed:', error.message));
    res.status(201).json(response);
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Those dates are no longer available' });
    next(error);
  } finally { connection.release(); }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'StayNest API route not found. Refresh the page and restart the application.' }));

// The admin UI is a separate path and requires an administrator session.
// Serve the admin shell so users can authenticate consistently from any browser.
// Every admin API remains protected by requireAdminAccess.
const serveAdminPage = async (req, res, next) => {
  const allowed = req.session.user?.roles?.includes('administrator') || req.session.adminGate === true;
  if (!allowed) return res.redirect('/index.html?admin=1');
  try {
    const nonce = crypto.randomBytes(16).toString('base64');
    const adminHtml = await readFile(path.resolve(process.cwd(), 'admin.html'), 'utf8');
    const htmlWithNonce = adminHtml.replace(/<script(\s|>)/g, `<script nonce="${nonce}"$1`);
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
      `script-src 'self' 'nonce-${nonce}'`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:"
    ].join('; '));
    return res.type('html').send(htmlWithNonce);
  } catch (error) {
    return next(error);
  }
};
app.get('/admin', serveAdminPage);
app.get('/admin.html', serveAdminPage);
// Only the public application shell should be reachable from the project root.
// Keep source, database files, dependencies, and private storage out of static hosting.
app.use((req, res, next) => {
  const pathname = decodeURIComponent(req.path).replace(/^\/+/, '').toLowerCase();
  const blocked = /^(?:server|database|node_modules|storage|tests|dist|\.git)(?:\/|$)|^(?:\.env|package(?:-lock)?\.json|vite\.config\.)/;
  if (blocked.test(pathname)) return res.status(404).end();
  next();
});
app.get('/app.js', async (_req, res, next) => {
  try {
    const source = await readFile(path.resolve(process.cwd(), 'app.js'), 'utf8');
    const browserSource = source.replace(
      "import L from 'leaflet';\nimport 'leaflet/dist/leaflet.css';",
      "import * as L from '/vendor/leaflet-src.esm.js';\nconst leafletStyles = document.createElement('link');\nleafletStyles.rel = 'stylesheet';\nleafletStyles.href = '/vendor/leaflet.css';\ndocument.head.append(leafletStyles);"
    );
    res.type('application/javascript').send(browserSource);
  } catch (error) {
    next(error);
  }
});
app.use(express.static('.'));
app.use((error, req, res, _next) => {
  console.error(JSON.stringify({
    level: 'error',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.session?.user?.id || null,
    error: error.message,
    code: error.code
  }));
  if (res.headersSent) return;
  const status = Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message, requestId: req.requestId });
});

const port = Number(process.env.PORT || 3000);
assertDatabaseConnection()
  .then(ensureSessionTable)
  .then(loadRuntimeConfig)
  .then(() => app.listen(port, () => {
    console.log(`StayNest server listening on ${port}`);
    console.log(JSON.stringify({
      level: 'info',
      event: 'ga4_configuration',
      propertyId: process.env.GA4_PROPERTY_ID || null,
      credentialsConfigured: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || null
    }));
    setInterval(async () => {
      try {
        const [rows] = await pool.query('SELECT id, title, body, audience FROM announcements WHERE status="scheduled" AND scheduled_for IS NOT NULL AND scheduled_for<=UTC_TIMESTAMP() LIMIT 20');
        for (const announcement of rows) {
          await deliverAnnouncement(announcement.id, announcement.title, announcement.body, announcement.audience);
          await pool.execute('UPDATE announcements SET status="published", published_at=UTC_TIMESTAMP() WHERE id=? AND status="scheduled"', [announcement.id]);
        }
      } catch (error) { console.error('Scheduled announcement processing failed:', error.message); }
    }, 60 * 1000);
  }))
  .catch(error => { console.error('Database connection failed:', error.message); process.exitCode = 1; });
