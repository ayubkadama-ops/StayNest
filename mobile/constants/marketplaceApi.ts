export type RentalMode = '' | 'short_term' | 'long_term';
export type ListingTransaction = '' | 'sale' | 'rent' | 'stay';
export type ListingSort = 'new' | 'price_low' | 'price_high' | 'popular' | 'relevance';

export type DiscoveryFilters = {
  q: string;
  location: string;
  propertyType: string;
  transactionType: ListingTransaction;
  rentalMode: RentalMode;
  sort: ListingSort;
  region?: string;
  district?: string;
  ward?: string;
  neighborhood?: string;
  pricePeriod?: '' | 'sale' | 'nightly' | 'monthly' | 'yearly';
  currency?: string;
  minPrice?: string;
  maxPrice?: string;
  minBedrooms?: string;
  maxBedrooms?: string;
  minBathrooms?: string;
  minSize?: string;
  maxSize?: string;
  furnished?: '' | 'furnished' | 'partially_furnished' | 'unfurnished';
  verificationStatus?: '' | 'verified' | 'unverified';
  amenities?: string[];
  availableFrom?: string;
  availableTo?: string;
};

export type ListingSummary = {
  id: number;
  title: string;
  description: string | null;
  city: string | null;
  neighborhood: string | null;
  region: string | null;
  district: string | null;
  ward: string | null;
  propertySize: number | null;
  furnished: string | null;
  verifiedAgent: boolean | null;
  propertyVerificationStatus: string | null;
  currency: string | null;
  transactionType: string | null;
  salePrice: number | null;
  nightlyPrice: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  rentalMode: string | null;
  propertyType: string | null;
  structureType: string | null;
  privacyType: string | null;
  plotSize: number | null;
  plotSizeUnit: string | null;
  landUse: string | null;
  titleStatus: string | null;
  floorArea: number | null;
  commercialUse: string | null;
  beds: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  amenities: string | null;
  rating: number | null;
  reviewCount: number | null;
  agentId: number | null;
  agentFirstName: string | null;
  agentLastName: string | null;
  agencyName: string | null;
  profileImageUrl: string | null;
  coverUrl: string | null;
  saved: boolean | null;
};

export type ListingMedia = {
  id: number;
  mediaType: string | null;
  mediaUrl: string;
  caption: string | null;
};

export type ListingReview = {
  rating: number;
  comment: string | null;
  createdAt: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type PropertyVerification = {
  status: string;
  identity: string;
  location: string;
  ownerOrAgentAuthorization: string;
  documents: string;
  verifiedAt: string | null;
  expiresAt: string | null;
};

export type ListingDetails = {
  listing: ListingSummary & {
    responseHours: number | null;
    verifiedAgent: boolean | null;
    propertyVerification: PropertyVerification | null;
    locationLatitude: number | null;
    locationLongitude: number | null;
  };
  media: ListingMedia[];
  reviews: ListingReview[];
  similar: ListingSummary[];
};

export type DiscoveryResult = {
  listings: ListingSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
};

export type SessionUser = {
  id: number | null;
  firstName: string;
  lastName: string;
  roles: string[];
  isSubAgent: boolean;
  permissions: string[];
};

export type AgentSummary = {
  assignedListings: number;
  pendingBookings: number;
  verificationStatus: number;
};

export type AgentListing = {
  id: number;
  title: string;
  status: string;
  rentalMode: string | null;
  transactionType: string | null;
  currency: string | null;
  salePrice: number | null;
  nightlyPrice: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  updatedAt: string | null;
};

export type AgentBooking = {
  id: number;
  bookingCode: string | null;
  bookingKind: string | null;
  appointmentAt: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  totalAmount: number | null;
  currency: string | null;
  status: string;
  listingId: number;
  title: string;
  city: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type AgentBookingDecision = 'confirmed' | 'declined';

export type AdminListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'unpublished'
  | 'rejected'
  | 'archived';

export type AdminListingDecision = 'published' | 'rejected' | 'unpublished';

export type AdminPostStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'unpublished'
  | 'rejected'
  | 'archived';

export type AdminPostDecision = 'draft' | 'published';

export type AdminListing = {
  id: number;
  title: string;
  city: string | null;
  status: AdminListingStatus;
  currency: string | null;
  nightlyPrice: number | null;
  monthlyPrice: number | null;
  ownerName: string;
};

export type AdminPost = {
  id: number | null;
  listingId: number;
  title: string;
  city: string | null;
  postType: string | null;
  caption: string | null;
  amenityTags: string[];
  createdAt: string | null;
  status: AdminPostStatus;
  agentName: string | null;
  likes: number;
  views: number;
};

export type AdminOverviewStats = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  activeAgents: number;
  activeTenants: number;
  activeSubagents: number;
  activeListings: number;
  listingsNeedingReview: number;
  pendingVerifications: number;
  pendingBookings: number;
  unreadNotifications: number;
  todaysBookings: number;
  grossBookingVolume: number;
  todaysAuditEvents: number;
};

export type AdminOverview = {
  stats: AdminOverviewStats;
  unavailableMetrics: (keyof AdminOverviewStats)[];
};

export type AdminUserStatus = 'pending' | 'active' | 'suspended' | 'deleted';

export type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: AdminUserStatus;
  roles: string[];
  mfaEnabled: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};

export type LoginResult =
  | { mfaRequired: true }
  | { mfaRequired: false; user: SessionUser };

export type RegistrationRole = 'tenant' | 'agent';

export type RegistrationInput = {
  role: RegistrationRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  agencyName: string;
  bio: string;
  password: string;
  rememberMe: boolean;
};

export type RegistrationResult = {
  role: RegistrationRole;
  pendingApproval: boolean;
  emailVerificationSent: boolean;
  message: string | null;
  approvalContact: {
    email: string | null;
    whatsapp: string | null;
    displayPhone: string | null;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAdminListingStatus(value: string): value is AdminListingStatus {
  return [
    'draft',
    'pending_review',
    'published',
    'unpublished',
    'rejected',
    'archived',
  ].includes(value);
}

function isAdminPostStatus(value: string): value is AdminPostStatus {
  return [
    'draft',
    'pending_review',
    'published',
    'unpublished',
    'rejected',
    'archived',
  ].includes(value);
}

function isAdminOverviewMetric(value: string): value is keyof AdminOverviewStats {
  return [
    'totalUsers',
    'activeUsers',
    'suspendedUsers',
    'activeAgents',
    'activeTenants',
    'activeSubagents',
    'activeListings',
    'listingsNeedingReview',
    'pendingVerifications',
    'pendingBookings',
    'unreadNotifications',
    'todaysBookings',
    'grossBookingVolume',
    'todaysAuditEvents',
  ].includes(value);
}

function isAdminUserStatus(value: string): value is AdminUserStatus {
  return ['pending', 'active', 'suspended', 'deleted'].includes(value);
}

function requiredCount(value: unknown, field: string): number {
  const parsed = nullableNumber(value, field);
  if (parsed === null || parsed < 0) {
    throw new Error(`The administrator overview contains an invalid ${field}.`);
  }
  return parsed;
}

function parseAdminPostTags(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error('The server returned invalid post amenity tags.');
    }
  }
  if (!Array.isArray(parsed)) {
    throw new Error('The server returned invalid post amenity tags.');
  }

  return parsed.map((tag) => {
    if (!isRecord(tag)) throw new Error('The server returned invalid post amenity tags.');
    const english = nullableString(tag.en, 'English amenity tag') ?? '';
    const swahili = nullableString(tag.sw, 'Swahili amenity tag') ?? '';
    return [english, swahili].filter(Boolean).join(' / ');
  });
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error(`The listings response contains an invalid ${field}.`);
  }
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`The listings response contains an invalid ${field}.`);
  }
  return parsed;
}

function nullableBoolean(value: unknown, field: string): boolean | null {
  if (value === null || value === undefined) return null;
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  throw new Error(`The listings response contains an invalid ${field}.`);
}

function requiredId(value: unknown): number {
  const id = nullableNumber(value, 'listing id');
  if (id === null || !Number.isInteger(id) || id < 1) {
    throw new Error('The listings response contains an invalid listing id.');
  }
  return id;
}

function parseListing(value: unknown): ListingSummary {
  if (!isRecord(value)) {
    throw new Error('The listings response contains an invalid listing.');
  }

  const title = nullableString(value.title, 'title');
  if (!title) throw new Error('The listings response contains a listing without a title.');

  return {
    id: requiredId(value.id),
    title,
    description: nullableString(value.description, 'description'),
    city: nullableString(value.city, 'city'),
    neighborhood: nullableString(value.neighborhood, 'neighborhood'),
    region: nullableString(value.region, 'region'),
    district: nullableString(value.district, 'district'),
    ward: nullableString(value.ward, 'ward'),
    propertySize: nullableNumber(value.propertySize, 'property size'),
    furnished: nullableString(value.furnished, 'furnishing'),
    verifiedAgent: nullableBoolean(value.verifiedAgent, 'agent verification'),
    propertyVerificationStatus: nullableString(value.propertyVerificationStatus, 'property verification status'),
    currency: nullableString(value.currency, 'currency'),
    transactionType: nullableString(value.transactionType, 'transaction type'),
    salePrice: nullableNumber(value.salePrice, 'sale price'),
    nightlyPrice: nullableNumber(value.nightlyPrice, 'nightly price'),
    monthlyPrice: nullableNumber(value.monthlyPrice, 'monthly price'),
    yearlyPrice: nullableNumber(value.yearlyPrice, 'yearly price'),
    rentalMode: nullableString(value.rentalMode, 'rental mode'),
    propertyType: nullableString(value.propertyType, 'property type'),
    structureType: nullableString(value.structureType, 'structure type'),
    privacyType: nullableString(value.privacyType, 'privacy type'),
    plotSize: nullableNumber(value.plotSize, 'plot size'),
    plotSizeUnit: nullableString(value.plotSizeUnit, 'plot size unit'),
    landUse: nullableString(value.landUse, 'land use'),
    titleStatus: nullableString(value.titleStatus, 'title status'),
    floorArea: nullableNumber(value.floorArea, 'floor area'),
    commercialUse: nullableString(value.commercialUse, 'commercial use'),
    beds: nullableNumber(value.beds, 'beds'),
    bedrooms: nullableNumber(value.bedrooms, 'bedrooms'),
    bathrooms: nullableNumber(value.bathrooms, 'bathrooms'),
    maxGuests: nullableNumber(value.maxGuests, 'maximum guests'),
    amenities: nullableString(value.amenities, 'amenities'),
    rating: nullableNumber(value.rating, 'rating'),
    reviewCount: nullableNumber(value.reviewCount, 'review count'),
    agentId: nullableNumber(value.agentId, 'agent id'),
    agentFirstName: nullableString(value.agentFirstName ?? value.firstName, 'agent first name'),
    agentLastName: nullableString(value.agentLastName ?? value.lastName, 'agent last name'),
    agencyName: nullableString(value.agencyName, 'agency name'),
    profileImageUrl: nullableString(value.profileImageUrl, 'agent photo'),
    coverUrl: nullableString(value.coverUrl, 'cover image'),
    saved: nullableBoolean(value.saved, 'saved state'),
  };
}

function requiredAgentCount(value: unknown, field: string): number {
  const parsed = nullableNumber(value, field);
  if (parsed === null || parsed < 0) {
    throw new Error(`The agent summary contains an invalid ${field}.`);
  }
  return parsed;
}

function parseAgentListing(value: unknown): AgentListing {
  if (!isRecord(value)) {
    throw new Error('The server returned an invalid agent listing.');
  }
  const title = nullableString(value.title, 'listing title');
  const status = nullableString(value.status, 'listing status');
  if (!title || !status) {
    throw new Error('The server returned an agent listing without a title or status.');
  }

  return {
    id: requiredId(value.id),
    title,
    status,
    rentalMode: nullableString(value.rental_mode, 'rental term'),
    transactionType: nullableString(value.transaction_type, 'transaction type'),
    currency: nullableString(value.currency, 'currency'),
    salePrice: nullableNumber(value.sale_price, 'sale price'),
    nightlyPrice: nullableNumber(value.nightly_price, 'nightly price'),
    monthlyPrice: nullableNumber(value.monthly_price, 'monthly price'),
    yearlyPrice: nullableNumber(value.yearly_price, 'yearly price'),
    rating: nullableNumber(value.average_rating, 'listing rating'),
    reviewCount: nullableNumber(value.review_count, 'review count'),
    updatedAt: nullableString(value.updated_at, 'listing update time'),
  };
}

function parseAgentBooking(value: unknown): AgentBooking {
  if (!isRecord(value)) {
    throw new Error('The server returned an invalid agent booking.');
  }
  const title = nullableString(value.title, 'booking property title');
  const status = nullableString(value.status, 'booking status');
  if (!title || !status) {
    throw new Error('The server returned a booking without a property title or status.');
  }

  return {
    id: requiredId(value.id),
    bookingCode: nullableString(value.bookingCode, 'booking code'),
    bookingKind: nullableString(value.bookingKind, 'booking kind'),
    appointmentAt: nullableString(value.appointmentAt, 'appointment time'),
    checkIn: nullableString(value.checkIn, 'check-in date'),
    checkOut: nullableString(value.checkOut, 'check-out date'),
    guests: nullableNumber(value.guests, 'guest count'),
    totalAmount: nullableNumber(value.totalAmount, 'booking total'),
    currency: nullableString(value.currency, 'booking currency'),
    status,
    listingId: requiredId(value.listingId),
    title,
    city: nullableString(value.city, 'booking city'),
    firstName: nullableString(value.firstName, 'customer first name'),
    lastName: nullableString(value.lastName, 'customer last name'),
  };
}

function getApiOrigin(): string {
  const configuredOrigin = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configuredOrigin) {
    throw new Error(
      'Set EXPO_PUBLIC_API_URL before starting Expo. Android emulator: http://10.0.2.2:3000; physical device: http://<computer-LAN-IP>:3000.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(configuredOrigin);
  } catch {
    throw new Error(
      'EXPO_PUBLIC_API_URL must be an HTTP(S) origin. Use http://10.0.2.2:3000 for an Android emulator or http://<computer-LAN-IP>:3000 for a physical device.',
    );
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.hostname.includes(';') ||
    parsed.hostname.includes(',') ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      'EXPO_PUBLIC_API_URL must be an HTTP(S) origin. Use http://10.0.2.2:3000 for an Android emulator or http://<computer-LAN-IP>:3000 for a physical device.',
    );
  }

  return parsed.origin;
}

function apiUrl(path: string): string {
  return new URL(path, `${getApiOrigin()}/`).toString();
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
  }
}

function responseError(payload: unknown, status: number): Error {
  const message = isRecord(payload) && typeof payload.error === 'string'
    ? payload.error
    : `The request failed (HTTP ${status}).`;
  return new Error(message);
}

export function resolveMediaUrl(path: string | null): string | null {
  if (!path) return null;
  const url = new URL(path, `${getApiOrigin()}/`);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The server returned an unsupported image URL.');
  }
  return url.toString();
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(apiUrl(path), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  return payload;
}

function parseSessionUser(value: unknown): SessionUser {
  if (!isRecord(value) || !Array.isArray(value.roles)) {
    throw new Error('The server returned an invalid session user.');
  }
  const id = nullableNumber(value.id, 'user id');
  if (id !== null && (!Number.isInteger(id) || id < 1)) {
    throw new Error('The server returned an invalid user id.');
  }

  const roles = value.roles.map((role) => {
    if (typeof role !== 'string') throw new Error('The server returned an invalid user role.');
    return role;
  });
  const permissions = Array.isArray(value.permissions)
    ? value.permissions.map((permission) => {
      if (typeof permission !== 'string') {
        throw new Error('The server returned invalid account permissions.');
      }
      return permission;
    })
    : [];

  return {
    id,
    firstName: nullableString(value.firstName, 'first name') ?? '',
    lastName: nullableString(value.lastName, 'last name') ?? '',
    roles,
    isSubAgent: value.isSubAgent === true,
    permissions,
  };
}

async function getCsrfToken(): Promise<string> {
  const payload = await getJson('/api/auth/csrf');
  if (!isRecord(payload) || typeof payload.token !== 'string' || payload.token.length === 0) {
    throw new Error('The server did not provide a secure request token.');
  }
  return payload.token;
}

async function postJson(
  path: string,
  body: Record<string, unknown>,
  csrfProtected: boolean,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (csrfProtected) headers['X-CSRF-Token'] = await getCsrfToken();

  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  return payload;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const payload = await getJson('/api/auth/me');
  if (!isRecord(payload) || !('user' in payload)) {
    throw new Error('The server returned an invalid session response.');
  }
  return payload.user === null ? null : parseSessionUser(payload.user);
}

export async function getAgentSummary(): Promise<AgentSummary> {
  const payload = await getJson('/api/agent/summary');
  if (!isRecord(payload)) {
    throw new Error('The server returned an invalid agent summary.');
  }
  return {
    assignedListings: requiredAgentCount(payload.assignedListings, 'assigned listings'),
    pendingBookings: requiredAgentCount(payload.pendingBookings, 'pending bookings'),
    verificationStatus: requiredAgentCount(payload.verificationStatus, 'pending verifications'),
  };
}

export async function getAgentListings(): Promise<AgentListing[]> {
  const payload = await getJson('/api/host/listings');
  if (!isRecord(payload) || !Array.isArray(payload.listings)) {
    throw new Error('The server returned an invalid agent listings response.');
  }
  return payload.listings.map(parseAgentListing);
}

export async function getAgentBookings(): Promise<AgentBooking[]> {
  const payload = await getJson('/api/agent/bookings');
  if (!isRecord(payload) || !Array.isArray(payload.bookings)) {
    throw new Error('The server returned an invalid agent bookings response.');
  }
  return payload.bookings.map(parseAgentBooking);
}

export async function decideAgentBooking(
  id: number,
  status: AgentBookingDecision,
): Promise<void> {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Choose a valid booking request.');
  }
  const payload = await postJson(`/api/agent/bookings/${id}/decision`, { status }, true);
  if (!isRecord(payload) || payload.ok !== true || payload.status !== status) {
    throw new Error('The server did not confirm the booking decision.');
  }
}

export async function signIn(
  identifier: string,
  password: string,
  rememberMe: boolean,
  mfaCode?: string,
): Promise<LoginResult> {
  const payload = await postJson('/api/auth/login', {
    email: identifier.trim(),
    password,
    rememberMe,
    ...(mfaCode ? { mfaCode: mfaCode.trim() } : {}),
  }, false);

  if (!isRecord(payload)) throw new Error('The server returned an invalid sign-in response.');
  if (payload.mfaRequired === true) return { mfaRequired: true };
  if (payload.ok !== true) throw new Error('The server could not complete sign-in.');

  const user = await getCurrentUser();
  if (!user) throw new Error('Sign-in succeeded, but the session could not be restored.');
  return { mfaRequired: false, user };
}

export async function registerAccount(input: RegistrationInput): Promise<RegistrationResult> {
  const payload = await postJson('/api/auth/register', {
    ...input,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    agencyName: input.agencyName.trim(),
    bio: input.bio.trim(),
  }, true);

  if (
    !isRecord(payload) ||
    payload.ok !== true ||
    payload.role !== input.role ||
    typeof payload.emailVerificationSent !== 'boolean'
  ) {
    throw new Error('The server returned an invalid account-creation response.');
  }

  const pendingApproval = payload.pendingApproval === true;
  if (
    (input.role === 'agent' && !pendingApproval) ||
    (input.role === 'tenant' && (pendingApproval || payload.requiresLogin !== true))
  ) {
    throw new Error('The server returned an unexpected account-creation status.');
  }

  let approvalContact: RegistrationResult['approvalContact'] = null;
  if (payload.approvalContact !== undefined) {
    if (!isRecord(payload.approvalContact)) {
      throw new Error('The server returned invalid agent approval contact details.');
    }
    approvalContact = {
      email: nullableString(payload.approvalContact.email, 'approval email'),
      whatsapp: nullableString(payload.approvalContact.whatsapp, 'approval WhatsApp'),
      displayPhone: nullableString(payload.approvalContact.displayPhone, 'approval phone'),
    };
  }

  return {
    role: input.role,
    pendingApproval,
    emailVerificationSent: payload.emailVerificationSent,
    message: nullableString(payload.message, 'registration message'),
    approvalContact,
  };
}

export async function requestPasswordReset(email: string): Promise<string> {
  const payload = await postJson('/api/auth/password-reset/request', {
    email: email.trim(),
  }, false);
  if (!isRecord(payload) || payload.ok !== true || typeof payload.message !== 'string') {
    throw new Error('The server returned an invalid password-recovery response.');
  }
  return payload.message;
}

export async function signInAdminGate(
  username: string,
  password: string,
): Promise<SessionUser> {
  const payload = await postJson('/api/admin/gate', {
    username: username.trim(),
    password,
  }, false);
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error('The server could not complete administrator sign-in.');
  }

  const user = await getCurrentUser();
  if (!user?.roles.includes('administrator')) {
    throw new Error('The server did not grant administrator access.');
  }
  return user;
}

export async function signOut(): Promise<void> {
  const response = await fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (response.status === 204) return;
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  throw new Error('The server returned an unexpected sign-out response.');
}

export async function getAdminListings(
  status: AdminListingStatus = 'pending_review',
): Promise<AdminListing[]> {
  const payload = await getJson(
    `/api/admin/listings?status=${encodeURIComponent(status)}&sort=recent&limit=50`,
  );
  if (!isRecord(payload) || !Array.isArray(payload.listings)) {
    throw new Error('The server returned an invalid administrator listings response.');
  }

  return payload.listings.map((value): AdminListing => {
    if (!isRecord(value)) throw new Error('The server returned an invalid listing record.');
    const listingStatus = nullableString(value.status, 'listing status');
    if (!listingStatus || !isAdminListingStatus(listingStatus)) {
      throw new Error('The server returned an unsupported listing status.');
    }

    return {
      id: requiredId(value.id),
      title: nullableString(value.title, 'title') || 'Untitled listing',
      city: nullableString(value.city, 'city'),
      status: listingStatus,
      currency: nullableString(value.currency, 'currency'),
      nightlyPrice: nullableNumber(value.nightly_price, 'nightly price'),
      monthlyPrice: nullableNumber(value.monthly_price, 'monthly price'),
      ownerName: nullableString(value.owner_name, 'owner name') || 'Unknown account',
    };
  });
}

export async function moderateListing(
  id: number,
  status: AdminListingDecision,
): Promise<void> {
  if (!Number.isInteger(id) || id < 1) throw new Error('Choose a valid listing.');
  await postJson(`/api/admin/listings/${id}/moderation`, { status }, true);
}

export async function getAdminPosts(
  status: AdminPostStatus = 'pending_review',
): Promise<AdminPost[]> {
  const payload = await getJson(
    `/api/admin/posts?status=${encodeURIComponent(status)}&limit=100`,
  );
  if (!isRecord(payload) || !Array.isArray(payload.posts)) {
    throw new Error('The server returned an invalid administrator posts response.');
  }

  return payload.posts.map((value): AdminPost => {
    if (!isRecord(value)) throw new Error('The server returned an invalid post record.');
    const postStatus = nullableString(value.status, 'post status');
    if (!postStatus || !isAdminPostStatus(postStatus)) {
      throw new Error('The server returned an unsupported post status.');
    }
    const likes = nullableNumber(value.likes, 'post likes');
    const views = nullableNumber(value.views, 'post views');
    if (likes === null || views === null) {
      throw new Error('The server returned a post without engagement counts.');
    }

    return {
      id: value.post_id === null || value.post_id === undefined
        ? null
        : requiredId(value.post_id),
      listingId: requiredId(value.listing_id),
      title: nullableString(value.title, 'listing title') || 'Untitled listing',
      city: nullableString(value.city, 'city'),
      postType: nullableString(value.post_type, 'post type'),
      caption: nullableString(value.caption, 'post caption'),
      amenityTags: parseAdminPostTags(value.amenity_tags),
      createdAt: nullableString(value.created_at, 'post creation time'),
      status: postStatus,
      agentName: nullableString(value.agent_name, 'agent name'),
      likes,
      views,
    };
  });
}

export async function moderatePost(
  id: number,
  status: AdminPostDecision,
): Promise<void> {
  if (!Number.isInteger(id) || id < 1) throw new Error('Choose a valid post.');
  await postJson(`/api/admin/posts/${id}/moderation`, { status }, true);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const payload = await getJson('/api/admin/overview');
  if (!isRecord(payload)) {
    throw new Error('The server returned an invalid administrator overview response.');
  }
  const unavailableMetricsPayload = payload.unavailableMetrics;
  if (unavailableMetricsPayload !== undefined && !Array.isArray(unavailableMetricsPayload)) {
    throw new Error('The server returned an invalid administrator overview response.');
  }
  const unavailableMetrics = (unavailableMetricsPayload ?? []).map((metric) => {
    if (typeof metric !== 'string' || !isAdminOverviewMetric(metric)) {
      throw new Error('The server returned an invalid unavailable overview metric.');
    }
    return metric;
  });

  return {
    stats: {
      totalUsers: requiredCount(payload.totalUsers, 'total users'),
      activeUsers: requiredCount(payload.activeUsers, 'active users'),
      suspendedUsers: requiredCount(payload.suspendedUsers, 'suspended users'),
      activeAgents: requiredCount(payload.activeAgents, 'active agents'),
      activeTenants: requiredCount(payload.activeTenants, 'active tenants'),
      activeSubagents: requiredCount(payload.activeSubagents, 'active sub-agents'),
      activeListings: requiredCount(payload.activeListings, 'active listings'),
      listingsNeedingReview: requiredCount(payload.listingsNeedingReview, 'listings needing review'),
      pendingVerifications: requiredCount(payload.pendingVerifications, 'pending verifications'),
      pendingBookings: requiredCount(payload.pendingBookings, 'pending bookings'),
      unreadNotifications: requiredCount(payload.unreadNotifications, 'unread notifications'),
      todaysBookings: requiredCount(payload.todaysBookings, "today's bookings"),
      grossBookingVolume: requiredCount(payload.grossBookingVolume, 'gross booking volume'),
      todaysAuditEvents: requiredCount(payload.todaysAuditEvents, "today's audit events"),
    },
    unavailableMetrics,
  };
}

export async function getAdminUsers(
  status: AdminUserStatus,
  query: string,
): Promise<AdminUser[]> {
  const params = new URLSearchParams({ status, limit: '100' });
  const normalizedQuery = query.trim().slice(0, 100);
  if (normalizedQuery) params.set('q', normalizedQuery);
  const payload = await getJson(`/api/admin/users?${params.toString()}`);
  if (!isRecord(payload) || !Array.isArray(payload.users)) {
    throw new Error('The server returned an invalid administrator users response.');
  }

  return payload.users.map((value): AdminUser => {
    if (!isRecord(value)) throw new Error('The server returned an invalid account record.');
    const userStatus = nullableString(value.status, 'account status');
    if (!userStatus || !isAdminUserStatus(userStatus)) {
      throw new Error('The server returned an unsupported account status.');
    }
    if (typeof value.roles !== 'string') {
      throw new Error('The server returned invalid account roles.');
    }
    const mfaEnabled = nullableBoolean(value.mfa_enabled, 'MFA status');
    if (mfaEnabled === null) throw new Error('The server returned invalid MFA status.');

    return {
      id: requiredId(value.id),
      firstName: nullableString(value.first_name, 'first name') ?? '',
      lastName: nullableString(value.last_name, 'last name') ?? '',
      email: nullableString(value.email, 'email address'),
      phone: nullableString(value.phone, 'phone number'),
      status: userStatus,
      roles: value.roles.split(',').map((role) => role.trim()).filter(Boolean),
      mfaEnabled,
      emailVerifiedAt: nullableString(value.email_verified_at, 'email verification time'),
      lastLoginAt: nullableString(value.last_login_at, 'last login time'),
      createdAt: nullableString(value.created_at, 'account creation time'),
    };
  });
}

export async function discoverListings(filters: DiscoveryFilters, page = 1): Promise<DiscoveryResult> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page })) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (typeof value === 'string' && value.trim()) {
      params.set(key, value.trim());
    } else if (typeof value === 'number') {
      params.set(key, String(value));
    }
  }
  params.set('sort', filters.sort);

  const payload = await getJson(`/api/listings/discover?${params.toString()}`);
  if (!isRecord(payload) || !Array.isArray(payload.listings) || !isRecord(payload.pagination)) {
    throw new Error('The server returned an invalid listings response.');
  }
  const { pagination } = payload;
  const pageValue = nullableNumber(pagination.page, 'results page');
  const limit = nullableNumber(pagination.limit, 'results page size');
  const total = nullableNumber(pagination.total, 'results count');
  const totalPages = nullableNumber(pagination.totalPages, 'results page count');
  const hasPrevious = nullableBoolean(pagination.hasPrevious, 'previous page state');
  const hasNext = nullableBoolean(pagination.hasNext, 'next page state');
  if (
    pageValue === null || limit === null || total === null || totalPages === null
    || hasPrevious === null || hasNext === null
    || !Number.isInteger(pageValue) || !Number.isInteger(limit)
    || !Number.isInteger(total) || !Number.isInteger(totalPages)
  ) {
    throw new Error('The server returned invalid listings pagination.');
  }
  return {
    listings: payload.listings.map(parseListing),
    pagination: { page: pageValue, limit, total, totalPages, hasPrevious, hasNext },
  };
}

export async function createSearchAlert(name: string, filters: DiscoveryFilters): Promise<void> {
  const savedFilters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      if (value.length) savedFilters[key] = value;
    } else if (typeof value === 'string' && value.trim() && !(key === 'sort' && value === 'new')) {
      savedFilters[key] = value.trim();
    }
  }
  await postJson('/api/search-alerts', {
    name: name.trim(),
    filters: savedFilters,
    frequency: 'daily',
  }, true);
}

export async function getListingDetails(id: string): Promise<ListingDetails> {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('Choose a valid property to view.');
  }

  const payload = await getJson(`/api/listings/${encodeURIComponent(id)}/details`);
  if (!isRecord(payload) || !Array.isArray(payload.media) || !Array.isArray(payload.reviews)) {
    throw new Error('The server returned an invalid property details response.');
  }

  const listing = parseListing(payload.listing);
  if (!Array.isArray(payload.similar)) {
    throw new Error('The server returned invalid similar property results.');
  }

  const media = payload.media.map((item): ListingMedia => {
    if (!isRecord(item)) throw new Error('The server returned invalid property media.');
    const mediaUrl = nullableString(item.mediaUrl, 'media URL');
    if (!mediaUrl) throw new Error('The server returned property media without a URL.');
    return {
      id: requiredId(item.id),
      mediaType: nullableString(item.mediaType, 'media type'),
      mediaUrl,
      caption: nullableString(item.caption, 'media caption'),
    };
  });

  const reviews = payload.reviews.map((item): ListingReview => {
    if (!isRecord(item)) throw new Error('The server returned an invalid review.');
    const rating = nullableNumber(item.rating, 'review rating');
    if (rating === null) throw new Error('The server returned a review without a rating.');
    return {
      rating,
      comment: nullableString(item.comment, 'review comment'),
      createdAt: nullableString(item.createdAt, 'review date'),
      firstName: nullableString(item.firstName, 'reviewer first name'),
      lastName: nullableString(item.lastName, 'reviewer last name'),
    };
  });

  return {
    listing: {
      ...listing,
      responseHours: nullableNumber(
        isRecord(payload.listing) ? payload.listing.responseHours : undefined,
        'agent response time',
      ),
      verifiedAgent: nullableBoolean(
        isRecord(payload.listing) ? payload.listing.verifiedAgent : undefined,
        'agent verification state',
      ),
      propertyVerification: isRecord(payload.listing) && isRecord(payload.listing.propertyVerification)
        ? {
          status: nullableString(payload.listing.propertyVerification.status, 'property verification status') ?? 'unverified',
          identity: nullableString(payload.listing.propertyVerification.identity, 'identity check status') ?? 'not_reviewed',
          location: nullableString(payload.listing.propertyVerification.location, 'location check status') ?? 'not_reviewed',
          ownerOrAgentAuthorization: nullableString(
            payload.listing.propertyVerification.ownerOrAgentAuthorization,
            'authorization check status',
          ) ?? 'not_reviewed',
          documents: nullableString(payload.listing.propertyVerification.documents, 'document review status') ?? 'not_reviewed',
          verifiedAt: nullableString(payload.listing.propertyVerification.verifiedAt, 'property verification date'),
          expiresAt: nullableString(payload.listing.propertyVerification.expiresAt, 'property verification expiry'),
        }
        : null,
      locationLatitude: nullableNumber(
        isRecord(payload.listing) ? payload.listing.locationLatitude : undefined,
        'latitude',
      ),
      locationLongitude: nullableNumber(
        isRecord(payload.listing) ? payload.listing.locationLongitude : undefined,
        'longitude',
      ),
    },
    media,
    reviews,
    similar: payload.similar.map(parseListing),
  };
}
