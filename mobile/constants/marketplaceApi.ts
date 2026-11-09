import Constants from 'expo-constants';

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
  locationLatitude: number | null;
  locationLongitude: number | null;
  propertySize: number | null;
  furnished: string | null;
  verifiedAgent: boolean | null;
  propertyVerificationStatus: string | null;
  currency: string | null;
  transactionType: string | null;
  salePrice: number | null;
  nightlyPrice: number | null;
  cleaningFee: number | null;
  minStayNights: number | null;
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

export type SavedListing = {
  id: number;
  title: string;
  city: string | null;
  neighborhood: string | null;
  currency: string | null;
  transactionType: string | null;
  salePrice: number | null;
  nightlyPrice: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  listingStatus: string;
  coverUrl: string | null;
};

export type SearchAlert = {
  id: number;
  name: string;
  filters: Record<string, unknown>;
  frequency: 'instant' | 'daily' | 'weekly';
  active: boolean;
  createdAt: string | null;
};

export type ListingReview = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string | null;
  firstName: string | null;
  lastName: string | null;
  hostReply: string | null;
  verifiedInteraction: boolean;
};

export type ReviewableBooking = {
  bookingId: number;
  checkIn: string | null;
  checkOut: string | null;
  listingId: number;
  listingTitle: string;
  agentId: number;
  agentName: string;
  listingReviewId: number | null;
  listingReviewStatus: string | null;
  agentReviewId: number | null;
  agentReviewStatus: string | null;
};

export type PublicAgentReview = {
  id: number;
  rating: number;
  comment: string;
  agentReply: string | null;
  createdAt: string | null;
  listingTitle: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type PublicAgentProfile = {
  id: number;
  firstName: string;
  lastName: string;
  bio: string | null;
  profileImageUrl: string | null;
  agencyName: string | null;
  agentRating: number | null;
  agentReviewCount: number;
  reviews: PublicAgentReview[];
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

export type BookingRequestInput =
  | {
    listingId: number;
    bookingKind: 'stay';
    checkIn: string;
    checkOut: string;
    guests: number;
    idempotencyKey: string;
  }
  | {
    listingId: number;
    bookingKind: 'viewing';
    appointmentAt: string;
    idempotencyKey: string;
  };

export type BookingRequestReceipt = {
  bookingId: number;
  bookingCode: string;
  amount: number;
  bookingKind: 'stay' | 'viewing';
};

export type AccountBooking = {
  id: number;
  bookingCode: string;
  bookingKind: 'stay' | 'viewing';
  appointmentAt: string | null;
  checkIn: string | null;
  checkOut: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string | null;
  listingId: number;
  title: string;
  listingSlug: string | null;
  listingReviewStatus: string | null;
  agentReviewStatus: string | null;
};

export type BookingDetail = {
  id: number;
  bookingCode: string;
  bookingKind: 'stay' | 'viewing';
  appointmentAt: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string | null;
  listingId: number;
  title: string;
  city: string | null;
  addressLine1: string | null;
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

export type NotificationPreferences = {
  saved_searches: boolean;
  price_drops: boolean;
  booking_updates: boolean;
  messages: boolean;
  followed_agents: boolean;
  marketing: boolean;
};

export type MessageConversation = {
  id: number;
  otherUserId: number;
  otherDisplayName: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
};

export type ConversationMessage = {
  id: number;
  body: string;
  senderId: number;
  createdAt: string;
  firstName: string;
  lastName: string;
};

export type SystemNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
};

export type TenantProfile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  avatarUrl: string | null;
  following: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    bio: string | null;
    followers: number;
    badgeLabel: string | null;
  }[];
};

export type TenantProfileInput = Pick<TenantProfile, 'firstName' | 'lastName' | 'phone' | 'city' | 'bio'>;

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

export type RegistrationRole = 'tenant' | 'property_owner' | 'agent';

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
    locationLatitude: nullableNumber(value.locationLatitude, 'latitude'),
    locationLongitude: nullableNumber(value.locationLongitude, 'longitude'),
    propertySize: nullableNumber(value.propertySize, 'property size'),
    furnished: nullableString(value.furnished, 'furnishing'),
    verifiedAgent: nullableBoolean(value.verifiedAgent, 'agent verification'),
    propertyVerificationStatus: nullableString(value.propertyVerificationStatus, 'property verification status'),
    currency: nullableString(value.currency, 'currency'),
    transactionType: nullableString(value.transactionType, 'transaction type'),
    salePrice: nullableNumber(value.salePrice, 'sale price'),
    nightlyPrice: nullableNumber(value.nightlyPrice, 'nightly price'),
    cleaningFee: nullableNumber(value.cleaningFee, 'cleaning fee'),
    minStayNights: nullableNumber(value.minStayNights, 'minimum stay nights'),
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
  const paymentStatus = nullableString(value.payment_status, 'booking payment status');
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
  const expoOrigin = Constants.expoConfig?.extra?.apiOrigin;
  const originValue = expoOrigin === undefined ? process.env.EXPO_PUBLIC_API_URL : expoOrigin;
  if (typeof originValue !== 'string') {
    throw new Error('The app configuration contains an invalid API origin.');
  }
  if (!originValue.trim()) {
    throw new Error(
      'Set EXPO_PUBLIC_API_URL before starting Expo. Android emulator: http://10.0.2.2:3000; physical device: http://<computer-LAN-IP>:3000.',
    );
  }
  const configuredOrigin = originValue.trim();

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

export function resolveMediaUrl(path: string | null, maxWidth?: number): string | null {
  if (!path) return null;
  const url = new URL(path, `${getApiOrigin()}/`);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The server returned an unsupported image URL.');
  }
  if (maxWidth !== undefined) {
    if (!Number.isInteger(maxWidth) || maxWidth < 96 || maxWidth > 2400) {
      throw new Error('The requested image size is invalid.');
    }
    const uploadPath = '/image/upload/';
    const uploadIndex = url.pathname.indexOf(uploadPath);
    if (url.hostname === 'res.cloudinary.com' && uploadIndex >= 0) {
      const transformationIndex = uploadIndex + uploadPath.length;
      url.pathname = `${url.pathname.slice(0, transformationIndex)}w_${maxWidth},c_limit,q_auto,f_auto/${url.pathname.slice(transformationIndex)}`;
    }
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
  additionalHeaders: Record<string, string> = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...additionalHeaders,
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

async function patchJson(path: string, body: Record<string, unknown>): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-CSRF-Token': await getCsrfToken(),
  };
  const response = await fetch(apiUrl(path), {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  return payload;
}

async function deleteJson(path: string): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': await getCsrfToken(),
    },
    credentials: 'include',
  });
  if (response.status === 204) return;
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  throw new Error('The server returned an unexpected response for this request.');
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const payload = await getJson('/api/auth/me');
  if (!isRecord(payload) || !('user' in payload)) {
    throw new Error('The server returned an invalid session response.');
  }
  return payload.user === null ? null : parseSessionUser(payload.user);
}

export async function getTenantProfile(): Promise<TenantProfile> {
  const payload = await getJson('/api/tenant/profile');
  if (!isRecord(payload) || !isRecord(payload.profile) || !Array.isArray(payload.following)) {
    throw new Error('The server returned an invalid tenant profile response.');
  }
  const profile = payload.profile;
  const email = nullableString(profile.email, 'profile email');
  if (!email) throw new Error('The server returned incomplete tenant profile details.');
  return {
    id: requiredId(profile.id),
    email,
    firstName: nullableString(profile.firstName, 'profile first name') ?? '',
    lastName: nullableString(profile.lastName, 'profile last name') ?? '',
    phone: nullableString(profile.phone, 'profile phone'),
    city: nullableString(profile.city, 'profile city'),
    bio: nullableString(profile.bio, 'profile bio'),
    avatarUrl: nullableString(profile.avatarUrl, 'profile photo'),
    following: payload.following.map((value) => {
      if (!isRecord(value)) throw new Error('The server returned an invalid followed agent.');
      return {
        id: requiredId(value.id),
        firstName: nullableString(value.firstName, 'followed agent first name') ?? '',
        lastName: nullableString(value.lastName, 'followed agent last name') ?? '',
        profileImageUrl: nullableString(value.profileImageUrl, 'followed agent photo'),
        bio: nullableString(value.bio, 'followed agent bio'),
        followers: nullableNumber(value.followers, 'agent follower count') ?? 0,
        badgeLabel: nullableString(value.badgeLabel, 'agent badge'),
      };
    }),
  };
}

export async function updateTenantProfile(input: TenantProfileInput): Promise<Omit<TenantProfile, 'id' | 'email' | 'avatarUrl' | 'following'>> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone?.trim() ?? '';
  const city = input.city?.trim() ?? '';
  const bio = input.bio?.trim() ?? '';
  if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) {
    throw new Error('First name and last name are required and must be 80 characters or fewer.');
  }
  if (phone && !/^\+?[0-9][0-9\s().-]{6,24}$/.test(phone)) {
    throw new Error('Enter a valid phone number.');
  }
  if (city.length > 80 || bio.length > 5000) {
    throw new Error('City must be 80 characters or fewer and your bio must be 5,000 characters or fewer.');
  }
  const payload = await patchJson('/api/tenant/profile', { firstName, lastName, phone, city, bio });
  if (!isRecord(payload) || payload.ok !== true || !isRecord(payload.profile)) {
    throw new Error('The server did not confirm the profile update.');
  }
  const profile = payload.profile;
  return {
    firstName: nullableString(profile.firstName, 'profile first name') ?? '',
    lastName: nullableString(profile.lastName, 'profile last name') ?? '',
    phone: nullableString(profile.phone, 'profile phone'),
    city: nullableString(profile.city, 'profile city'),
    bio: nullableString(profile.bio, 'profile bio'),
  };
}

export async function uploadTenantProfilePhoto(file: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('profilePic', file, filename);
  const response = await fetch(apiUrl('/api/tenant/profile/photo'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': await getCsrfToken(),
    },
    credentials: 'include',
    body: formData,
  });
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  if (!isRecord(payload) || typeof payload.avatarUrl !== 'string' || !payload.avatarUrl.trim()) {
    throw new Error('The server returned an invalid profile photo response.');
  }
  return payload.avatarUrl;
}

export async function getMessageConversations(page = 1): Promise<{ conversations: MessageConversation[]; page: number; limit: number }> {
  if (!Number.isInteger(page) || page < 1) throw new Error('Choose a valid inbox page.');
  const payload = await getJson(`/api/messages?page=${page}&limit=50`);
  if (!isRecord(payload) || !Array.isArray(payload.conversations)) {
    throw new Error('The server returned an invalid inbox response.');
  }
  const responsePage = nullableNumber(payload.page, 'inbox page');
  const limit = nullableNumber(payload.limit, 'inbox page size');
  if (responsePage !== page || limit === null || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('The server returned invalid inbox pagination.');
  }
  return {
    conversations: payload.conversations.map((value) => {
      if (!isRecord(value)) throw new Error('The server returned an invalid conversation.');
      const otherDisplayName = nullableString(value.otherDisplayName, 'conversation member name');
      const otherFirstName = nullableString(value.otherFirstName, 'conversation member first name');
      const otherLastName = nullableString(value.otherLastName, 'conversation member last name');
      return {
        id: requiredId(value.conversationId),
        otherUserId: requiredId(value.otherUserId),
        otherDisplayName: otherDisplayName?.trim()
          || [otherFirstName, otherLastName].filter(Boolean).join(' ')
          || 'Makazi Go member',
        lastMessage: nullableString(value.lastMessage, 'last message') ?? '',
        lastMessageAt: nullableString(value.lastMessageAt, 'last message date'),
        unread: requiredCount(value.unread, 'unread messages'),
      };
    }),
    page: responsePage ?? page,
    limit: limit ?? 100,
  };
}

export async function getConversationMessages(
  conversationId: number,
  page = 1,
): Promise<{ messages: ConversationMessage[]; page: number; limit: number }> {
  if (!Number.isInteger(conversationId) || conversationId < 1) throw new Error('Choose a valid conversation.');
  if (!Number.isInteger(page) || page < 1) throw new Error('Choose a valid conversation page.');
  const payload = await getJson(`/api/messages/${conversationId}?page=${page}&limit=100`);
  if (!isRecord(payload) || !Array.isArray(payload.messages)) {
    throw new Error('The server returned an invalid conversation history.');
  }
  const responsePage = nullableNumber(payload.page, 'conversation page');
  const limit = nullableNumber(payload.limit, 'conversation page size');
  if (responsePage !== page || limit !== 100) {
    throw new Error('The server returned invalid conversation pagination.');
  }
  return {
    messages: payload.messages.map((value) => {
      if (!isRecord(value)) throw new Error('The server returned an invalid conversation message.');
      const body = nullableString(value.body, 'message body');
      const createdAt = nullableString(value.createdAt, 'message date');
      if (!body || !createdAt) throw new Error('The server returned an incomplete conversation message.');
      return {
        id: requiredId(value.id),
        body,
        senderId: requiredId(value.senderId),
        createdAt,
        firstName: nullableString(value.firstName, 'message sender first name') ?? '',
        lastName: nullableString(value.lastName, 'message sender last name') ?? '',
      };
    }),
    page: responsePage ?? page,
    limit: limit ?? 50,
  };
}

export async function getUnreadMessageCount(): Promise<number> {
  const payload = await getJson('/api/messages/unread-count');
  if (!isRecord(payload)) throw new Error('The server returned an invalid unread message count.');
  return requiredCount(payload.unread, 'unread messages');
}

export async function sendMessage(recipientId: number, body: string): Promise<{ conversationId: number; messageId: number }> {
  const message = body.trim();
  if (!Number.isInteger(recipientId) || recipientId < 1) throw new Error('Choose a valid message recipient.');
  if (!message || message.length > 2000) throw new Error('Message must be between 1 and 2,000 characters.');
  const payload = await postJson('/api/messages', { recipientId, body: message }, true);
  if (!isRecord(payload)) throw new Error('The server returned an invalid message receipt.');
  return {
    conversationId: requiredId(payload.conversationId),
    messageId: requiredId(payload.messageId),
  };
}

export async function getUserBlockStatus(userId: number): Promise<boolean> {
  if (!Number.isInteger(userId) || userId < 1) throw new Error('Choose a valid user.');
  const payload = await getJson(`/api/users/${userId}/block`);
  if (!isRecord(payload) || typeof payload.blocked !== 'boolean') {
    throw new Error('The server returned an invalid user block status.');
  }
  return payload.blocked;
}

export async function setUserBlocked(userId: number, blocked: boolean): Promise<void> {
  if (!Number.isInteger(userId) || userId < 1) throw new Error('Choose a valid user.');
  if (blocked) {
    const payload = await postJson(`/api/users/${userId}/block`, {}, true);
    if (!isRecord(payload) || payload.blocked !== true) {
      throw new Error('The server did not confirm the user was blocked.');
    }
    return;
  }
  const response = await fetch(apiUrl(`/api/users/${userId}/block`), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': await getCsrfToken(),
    },
    credentials: 'include',
  });
  if (response.status === 204) return;
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  throw new Error('The server returned an unexpected response while unblocking the user.');
}

export async function reportUser(userId: number, reason: string, details?: string): Promise<void> {
  if (!Number.isInteger(userId) || userId < 1) throw new Error('Choose a valid user to report.');
  const normalizedReason = reason.trim();
  const normalizedDetails = details?.trim() ?? '';
  if (!normalizedReason || normalizedReason.length > 120 || normalizedDetails.length > 1000) {
    throw new Error('Enter a report reason of 1–120 characters and details of no more than 1,000 characters.');
  }
  await postJson('/api/reports', {
    entityType: 'user',
    entityId: userId,
    reason: normalizedReason,
    details: normalizedDetails || undefined,
  }, true);
}

export async function getSystemNotifications(page = 1): Promise<{
  notifications: SystemNotification[];
  unread: number;
  page: number;
  limit: number;
}> {
  if (!Number.isInteger(page) || page < 1) throw new Error('Choose a valid notifications page.');
  const payload = await getJson(`/api/notifications?page=${page}&limit=50`);
  if (!isRecord(payload) || !Array.isArray(payload.notifications)) {
    throw new Error('The server returned an invalid notifications response.');
  }
  const responsePage = nullableNumber(payload.page, 'notifications page');
  const limit = nullableNumber(payload.limit, 'notifications page size');
  if (responsePage !== page || limit === null || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('The server returned invalid notifications pagination.');
  }
  return {
    notifications: payload.notifications.map((value) => {
      if (!isRecord(value)) throw new Error('The server returned an invalid notification.');
      const type = nullableString(value.type, 'notification type');
      const title = nullableString(value.title, 'notification title');
      const body = nullableString(value.body, 'notification body');
      const createdAt = nullableString(value.createdAt, 'notification date');
      if (!type || !title || !createdAt) throw new Error('The server returned an incomplete notification.');
      return {
        id: requiredId(value.id),
        type,
        title,
        body: body ?? '',
        data: value.data,
        readAt: nullableString(value.readAt, 'notification read date'),
        createdAt,
      };
    }),
    unread: requiredCount(payload.unread, 'unread notifications'),
    page: responsePage ?? page,
    limit: limit ?? 50,
  };
}

export async function markSystemNotificationsRead(): Promise<void> {
  const payload = await postJson('/api/notifications/read', {}, true);
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error('The server did not confirm the notifications were marked as read.');
  }
}

function parseNotificationPreferences(value: unknown): NotificationPreferences {
  if (!isRecord(value)) {
    throw new Error('The server returned invalid notification preferences.');
  }
  const enabled = (key: keyof NotificationPreferences): boolean => {
    const preference = nullableBoolean(value[key], `notification preference ${key}`);
    if (preference === null) {
      throw new Error('The server returned incomplete notification preferences.');
    }
    return preference;
  };
  return {
    saved_searches: enabled('saved_searches'),
    price_drops: enabled('price_drops'),
    booking_updates: enabled('booking_updates'),
    messages: enabled('messages'),
    followed_agents: enabled('followed_agents'),
    marketing: enabled('marketing'),
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const payload = await getJson('/api/account/notification-preferences');
  if (!isRecord(payload)) throw new Error('The server returned an invalid preferences response.');
  return parseNotificationPreferences(payload.preferences);
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const payload = await patchJson('/api/account/notification-preferences', preferences);
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error('The server did not confirm the notification preference update.');
  }
  return parseNotificationPreferences(payload.preferences);
}

export async function changeAccountPassword(currentPassword: string, password: string): Promise<void> {
  if (!currentPassword || password.length < 12) {
    throw new Error('Enter your current password and a new password with at least 12 characters.');
  }
  const payload = await postJson('/api/account/change-password', { currentPassword, password }, true);
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error('The server did not confirm the password change.');
  }
}

export async function requestAccountDeletion(password: string, reason: string): Promise<void> {
  if (!password) throw new Error('Enter your password to request account deletion.');
  const response = await fetch(apiUrl('/api/account'), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-Token': await getCsrfToken(),
    },
    credentials: 'include',
    body: JSON.stringify({ password, reason: reason.trim().slice(0, 500) }),
  });
  const payload = await responseJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error('The server did not confirm the account deletion request.');
  }
}

export async function setListingSaved(listingId: number, saved: boolean): Promise<void> {
  if (!Number.isSafeInteger(listingId) || listingId < 1) {
    throw new Error('Choose a valid property.');
  }
  if (saved) {
    const payload = await postJson(`/api/listings/${listingId}/save`, {}, true);
    if (!isRecord(payload) || payload.saved !== true) {
      throw new Error('The server did not confirm that the property was saved.');
    }
    return;
  }
  await deleteJson(`/api/listings/${listingId}/save`);
}

export async function getSavedListings(): Promise<SavedListing[]> {
  const payload = await getJson('/api/account/saved-listings');
  if (!isRecord(payload) || !Array.isArray(payload.listings)) {
    throw new Error('The server returned an invalid saved-properties response.');
  }
  return payload.listings.map((value): SavedListing => {
    if (!isRecord(value)) throw new Error('The server returned an invalid saved property.');
    const title = nullableString(value.title, 'saved property title');
    const listingStatus = nullableString(value.listingStatus, 'saved property status');
    if (!title || !listingStatus) {
      throw new Error('The server returned incomplete saved-property details.');
    }
    return {
      id: requiredId(value.id),
      title,
      city: nullableString(value.city, 'saved property city'),
      neighborhood: nullableString(value.neighborhood, 'saved property neighborhood'),
      currency: nullableString(value.currency, 'saved property currency'),
      transactionType: nullableString(value.transactionType, 'saved property transaction type'),
      salePrice: nullableNumber(value.salePrice, 'saved property sale price'),
      nightlyPrice: nullableNumber(value.nightlyPrice, 'saved property nightly price'),
      monthlyPrice: nullableNumber(value.monthlyPrice, 'saved property monthly price'),
      yearlyPrice: nullableNumber(value.yearlyPrice, 'saved property yearly price'),
      rating: nullableNumber(value.rating, 'saved property rating'),
      reviewCount: nullableNumber(value.reviewCount, 'saved property review count'),
      listingStatus,
      coverUrl: nullableString(value.coverUrl, 'saved property cover image'),
    };
  });
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
    (input.role !== 'agent' && (pendingApproval || payload.requiresLogin !== true))
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

export async function createSearchAlert(name: string, filters: DiscoveryFilters): Promise<number> {
  const alertName = name.trim();
  if (!alertName || alertName.length > 120) {
    throw new Error('Enter a search name up to 120 characters.');
  }

  const savedFilters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      if (value.length) savedFilters[key] = value;
    } else if (
      typeof value === 'string'
      && value.trim()
      && !(key === 'sort' && value === 'new')
      && !(key === 'currency' && !filters.minPrice && !filters.maxPrice)
    ) {
      savedFilters[key] = value.trim();
    }
  }
  if (!Object.keys(savedFilters).length) {
    throw new Error('Apply at least one filter before saving.');
  }

  const payload = await postJson('/api/search-alerts', {
    name: alertName,
    filters: savedFilters,
    frequency: 'daily',
  }, true);
  if (!isRecord(payload)) {
    throw new Error('The server returned an invalid saved-search response.');
  }
  const id = nullableNumber(payload.id, 'search alert id');
  if (id === null || !Number.isSafeInteger(id) || id < 1) {
    throw new Error('The server returned an invalid saved-search identifier.');
  }
  return id;
}

function parseSearchAlertFilters(value: unknown): Record<string, unknown> {
  let filters = value;
  if (typeof filters === 'string') {
    try {
      filters = JSON.parse(filters);
    } catch {
      throw new Error('The server returned invalid saved-search filters.');
    }
  }
  if (!isRecord(filters)) {
    throw new Error('The server returned invalid saved-search filters.');
  }
  return filters;
}

export async function getSearchAlerts(): Promise<SearchAlert[]> {
  const payload = await getJson('/api/account/search-alerts');
  if (!isRecord(payload) || !Array.isArray(payload.alerts)) {
    throw new Error('The server returned an invalid saved-search response.');
  }
  return payload.alerts.map((value): SearchAlert => {
    if (!isRecord(value)) throw new Error('The server returned an invalid saved search.');
    const name = nullableString(value.name, 'search alert name');
    const frequency = nullableString(value.frequency, 'search alert frequency');
    const active = nullableBoolean(value.active, 'search alert status');
    const id = nullableNumber(value.id, 'search alert id');
    if (
      !name
      || (frequency !== 'instant' && frequency !== 'daily' && frequency !== 'weekly')
      || active === null
      || id === null
      || !Number.isSafeInteger(id)
      || id < 1
    ) {
      throw new Error('The server returned incomplete saved-search details.');
    }
    return {
      id,
      name,
      filters: parseSearchAlertFilters(value.filters),
      frequency,
      active,
      createdAt: nullableString(value.createdAt, 'search alert creation time'),
    };
  });
}

export async function deleteSearchAlert(alertId: number): Promise<void> {
  if (!Number.isSafeInteger(alertId) || alertId < 1) {
    throw new Error('Choose a valid saved search.');
  }
  await deleteJson(`/api/search-alerts/${alertId}`);
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
      id: requiredId(item.id),
      rating,
      comment: nullableString(item.comment, 'review comment'),
      createdAt: nullableString(item.createdAt, 'review date'),
      firstName: nullableString(item.firstName, 'reviewer first name'),
      lastName: nullableString(item.lastName, 'reviewer last name'),
      hostReply: nullableString(item.hostReply, 'agent response'),
      verifiedInteraction: nullableBoolean(item.verifiedInteraction, 'verified interaction') === true,
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

export async function createBookingRequest(input: BookingRequestInput): Promise<BookingRequestReceipt> {
  if (!Number.isSafeInteger(input.listingId) || input.listingId < 1) {
    throw new Error('Choose a valid property.');
  }
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(input.idempotencyKey)) {
    throw new Error('The booking request could not be safely retried. Please try again.');
  }

  let body: Record<string, unknown>;
  if (input.bookingKind === 'stay') {
    const isCalendarDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!isCalendarDate(input.checkIn) || !isCalendarDate(input.checkOut) || input.checkOut <= input.checkIn) {
      throw new Error('Choose a valid check-in and check-out date.');
    }
    if (!Number.isSafeInteger(input.guests) || input.guests < 1 || input.guests > 100) {
      throw new Error('Choose a valid guest count.');
    }
    body = {
      listingId: input.listingId,
      bookingKind: input.bookingKind,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
    };
  } else {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(input.appointmentAt)
      || !Number.isFinite(Date.parse(input.appointmentAt))) {
      throw new Error('Choose a valid viewing date and time.');
    }
    body = {
      listingId: input.listingId,
      bookingKind: input.bookingKind,
      appointmentAt: input.appointmentAt,
    };
  }

  const payload = await postJson(
    '/api/bookings',
    body,
    true,
    { 'Idempotency-Key': input.idempotencyKey },
  );
  if (!isRecord(payload)) throw new Error('The server returned an invalid booking confirmation.');
  const bookingId = nullableNumber(payload.bookingId, 'booking request id');
  const bookingCode = nullableString(payload.bookingCode, 'booking request code');
  const amount = nullableNumber(payload.amount, 'booking amount');
  if (bookingId === null || !Number.isSafeInteger(bookingId) || bookingId < 1
    || !bookingCode?.trim() || amount === null || amount < 0
    || payload.bookingKind !== input.bookingKind) {
    throw new Error('The server returned an incomplete booking confirmation.');
  }
  return { bookingId, bookingCode, amount, bookingKind: input.bookingKind };
}

export async function getAccountBookings(): Promise<AccountBooking[]> {
  const payload = await getJson('/api/account/bookings');
  if (!isRecord(payload) || !Array.isArray(payload.bookings)) {
    throw new Error('The server returned an invalid booking history response.');
  }
  return payload.bookings.map((value): AccountBooking => {
    if (!isRecord(value)) throw new Error('The server returned an invalid booking.');
    const bookingKind = value.booking_kind;
    const title = nullableString(value.title, 'booking property title');
    const currency = nullableString(value.currency, 'booking currency');
    const status = nullableString(value.status, 'booking status');
    const paymentStatus = nullableString(value.payment_status, 'booking payment status');
    const bookingCode = nullableString(value.booking_code, 'booking code');
    const totalAmount = nullableNumber(value.total_amount, 'booking total');
    if (!title || !currency || !status || !paymentStatus || !bookingCode || totalAmount === null
      || (bookingKind !== 'stay' && bookingKind !== 'viewing')) {
      throw new Error('The server returned incomplete booking history details.');
    }
    return {
      id: requiredId(value.id),
      bookingCode,
      bookingKind,
      appointmentAt: nullableString(value.appointment_at, 'appointment time'),
      checkIn: nullableString(value.check_in, 'check-in date'),
      checkOut: nullableString(value.check_out, 'check-out date'),
      totalAmount,
      currency,
      status,
      paymentStatus,
      createdAt: nullableString(value.created_at, 'booking creation date'),
      listingId: requiredId(value.listing_id),
      title,
      listingSlug: nullableString(value.slug, 'listing slug'),
      listingReviewStatus: nullableString(value.listing_review_status, 'listing review status'),
      agentReviewStatus: nullableString(value.agent_review_status, 'agent review status'),
    };
  });
}

export async function getBookingDetails(id: number): Promise<BookingDetail> {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Choose a valid booking.');
  const payload = await getJson(`/api/bookings/${id}`);
  if (!isRecord(payload) || !isRecord(payload.booking)) {
    throw new Error('The server returned an invalid booking detail response.');
  }
  const value = payload.booking;
  const bookingKind = value.bookingKind;
  const title = nullableString(value.title, 'booking property title');
  const bookingCode = nullableString(value.bookingCode, 'booking code');
  const currency = nullableString(value.currency, 'booking currency');
  const status = nullableString(value.status, 'booking status');
  const paymentStatus = nullableString(value.paymentStatus, 'booking payment status');
  const guests = nullableNumber(value.guests, 'booking guest count');
  const totalAmount = nullableNumber(value.totalAmount, 'booking total');
  if (!title || !bookingCode || !currency || !status || !paymentStatus || guests === null || totalAmount === null
    || (bookingKind !== 'stay' && bookingKind !== 'viewing')) {
    throw new Error('The server returned incomplete booking details.');
  }
  return {
    id: requiredId(value.id),
    bookingCode,
    bookingKind,
    appointmentAt: nullableString(value.appointmentAt, 'appointment time'),
    checkIn: nullableString(value.checkIn, 'check-in date'),
    checkOut: nullableString(value.checkOut, 'check-out date'),
    guests,
    totalAmount,
    currency,
    status,
    paymentStatus,
    createdAt: nullableString(value.createdAt, 'booking creation date'),
    listingId: requiredId(value.listingId),
    title,
    city: nullableString(value.city, 'property city'),
    addressLine1: nullableString(value.addressLine1, 'property address'),
  };
}

export async function cancelAccountBooking(id: number): Promise<void> {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Choose a valid booking.');
  const payload = await postJson(`/api/bookings/${id}/cancel`, { reason: 'Cancelled by guest' }, true);
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error('The server did not confirm the booking cancellation.');
  }
}

export async function rescheduleAccountBooking(
  id: number,
  checkIn: string,
  checkOut: string,
): Promise<void> {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Choose a valid booking.');
  const isCalendarDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut) || checkOut <= checkIn) {
    throw new Error('Choose valid new check-in and check-out dates.');
  }
  const payload = await patchJson(`/api/bookings/${id}/reschedule`, { checkIn, checkOut });
  if (!isRecord(payload) || payload.ok !== true || payload.status !== 'pending') {
    throw new Error('The server did not confirm the rescheduled booking request.');
  }
}

export async function getReviewableBookings(): Promise<ReviewableBooking[]> {
  const payload = await getJson('/api/account/reviewable-bookings');
  if (!isRecord(payload) || !Array.isArray(payload.bookings)) {
    throw new Error('The server returned an invalid reviewable bookings response.');
  }
  return payload.bookings.map((value): ReviewableBooking => {
    if (!isRecord(value)) throw new Error('The server returned an invalid completed booking.');
    const listingTitle = nullableString(value.listingTitle, 'listing title');
    const agentName = nullableString(value.agentName, 'agent name');
    if (!listingTitle || !agentName) throw new Error('The server returned incomplete booking review details.');
    return {
      bookingId: requiredId(value.bookingId),
      checkIn: nullableString(value.checkIn, 'booking check-in'),
      checkOut: nullableString(value.checkOut, 'booking check-out'),
      listingId: requiredId(value.listingId),
      listingTitle,
      agentId: requiredId(value.agentId),
      agentName,
      listingReviewId: value.listingReviewId == null ? null : requiredId(value.listingReviewId),
      listingReviewStatus: nullableString(value.listingReviewStatus, 'property review status'),
      agentReviewId: value.agentReviewId == null ? null : requiredId(value.agentReviewId),
      agentReviewStatus: nullableString(value.agentReviewStatus, 'agent review status'),
    };
  });
}

export async function submitListingReview(
  listingId: number,
  bookingId: number,
  rating: number,
  comment: string,
): Promise<void> {
  await postJson(`/api/listings/${listingId}/reviews`, { bookingId, rating, comment }, true);
}

export async function submitAgentReview(
  agentId: number,
  bookingId: number,
  rating: number,
  comment: string,
): Promise<void> {
  await postJson(`/api/agents/${agentId}/reviews`, { bookingId, rating, comment }, true);
}

export async function replyToAgentReview(
  agentId: number,
  reviewId: number,
  reply: string,
): Promise<void> {
  await postJson(`/api/agents/${agentId}/reviews/${reviewId}/reply`, { reply }, true);
}

export async function reportReview(reviewId: number): Promise<void> {
  await reportReviewEntity(reviewId, 'review');
}

export async function reportAgentReview(reviewId: number): Promise<void> {
  await reportReviewEntity(reviewId, 'agent_review');
}

async function reportReviewEntity(reviewId: number, entityType: 'review' | 'agent_review'): Promise<void> {
  await postJson('/api/reports', {
    entityType,
    entityId: reviewId,
    reason: 'Potentially inappropriate review',
    details: 'Reported from the mobile review list.',
  }, true);
}

export async function getPublicAgentProfile(id: string): Promise<PublicAgentProfile> {
  if (!/^[1-9]\d*$/.test(id)) throw new Error('Choose a valid agent profile.');
  const payload = await getJson(`/api/agents/${encodeURIComponent(id)}/profile`);
  if (!isRecord(payload) || !isRecord(payload.profile) || !Array.isArray(payload.reviews)) {
    throw new Error('The server returned an invalid agent profile response.');
  }
  const profile = payload.profile;
  const rating = nullableNumber(profile.agentRating, 'agent rating');
  const count = nullableNumber(profile.agentReviewCount, 'agent review count');
  if (count === null || !Number.isInteger(count) || count < 0) {
    throw new Error('The server returned an invalid agent review count.');
  }
  return {
    id: requiredId(profile.id),
    firstName: nullableString(profile.firstName, 'agent first name') ?? '',
    lastName: nullableString(profile.lastName, 'agent last name') ?? '',
    bio: nullableString(profile.bio, 'agent biography'),
    profileImageUrl: nullableString(profile.profileImageUrl, 'agent photo'),
    agencyName: nullableString(profile.agencyName, 'agency name'),
    agentRating: rating,
    agentReviewCount: count,
    reviews: payload.reviews.map((value): PublicAgentReview => {
      if (!isRecord(value)) throw new Error('The server returned an invalid agent review.');
      const reviewRating = nullableNumber(value.rating, 'agent review rating');
      const comment = nullableString(value.comment, 'agent review comment');
      if (reviewRating === null || !comment) throw new Error('The server returned an incomplete agent review.');
      return {
        id: requiredId(value.id),
        rating: reviewRating,
        comment,
        agentReply: nullableString(value.agentReply, 'agent response'),
        createdAt: nullableString(value.createdAt, 'review date'),
        listingTitle: nullableString(value.listingTitle, 'reviewed stay'),
        firstName: nullableString(value.firstName, 'reviewer first name'),
        lastName: nullableString(value.lastName, 'reviewer last name'),
      };
    }),
  };
}
