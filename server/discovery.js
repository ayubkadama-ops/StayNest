import { isValidDate } from './validation.js';

const TRANSACTION_TYPES = new Set(['sale', 'rent', 'stay', 'both']);
const PROPERTY_TYPES = new Set(['apartment', 'house', 'room', 'commercial', 'land', 'hotel', 'short_stay']);
const SEARCH_COLUMNS = Object.freeze([
  'l.title',
  'l.description',
  'l.neighborhood',
  'l.city',
  'l.region',
  'l.district',
  'l.ward',
  'l.address_line1',
  'pt.name'
]);
const PRICE_COLUMNS = Object.freeze({
  sale: 'l.sale_price',
  nightly: 'l.nightly_price',
  monthly: 'l.monthly_price',
  yearly: 'l.yearly_price'
});
const SIZE_IN_SQUARE_METRES = `CASE
  WHEN pt.name='land' THEN l.plot_size * CASE l.plot_size_unit
    WHEN 'acres' THEN 4046.856422
    WHEN 'hectares' THEN 10000
    ELSE 1
  END
  WHEN pt.name='commercial' THEN l.floor_area
  ELSE l.property_size
END`;

function boundedText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function optionalNumber(value, { integer = false } = {}) {
  if (value === undefined || value === null || value === '') return { value: null };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    return { error: 'Enter valid non-negative filter values' };
  }
  return { value: parsed };
}

function optionalDate(value) {
  if (value === undefined || value === null || value === '') return { value: null };
  const date = boundedText(String(value), 10);
  if (!isValidDate(date)) return { error: 'Choose valid availability dates' };
  return { value: date };
}

function selectedAmenities(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values.map(item => boundedText(String(item), 80)).filter(Boolean))].slice(0, 5);
}

export function createDiscoveryPlan(input, { defaultLimit = 24, maxLimit = 60 } = {}) {
  const filters = {
    query: boundedText(input.q, 100),
    location: boundedText(input.location, 100),
    region: boundedText(input.region, 100),
    district: boundedText(input.district, 100),
    ward: boundedText(input.ward, 100),
    neighborhood: boundedText(input.neighborhood, 120),
    propertyType: boundedText(input.propertyType, 50).toLowerCase(),
    transactionType: boundedText(input.transactionType, 20).toLowerCase(),
    rentalMode: boundedText(input.rentalMode, 20).toLowerCase(),
    furnished: boundedText(input.furnished, 30).toLowerCase(),
    verificationStatus: boundedText(input.verificationStatus, 20).toLowerCase(),
    pricePeriod: boundedText(input.pricePeriod, 20).toLowerCase(),
    currency: boundedText(input.currency, 12).toUpperCase(),
    sort: boundedText(input.sort, 20).toLowerCase() || 'new',
    amenities: selectedAmenities(input.amenities)
  };
  if (filters.transactionType && !TRANSACTION_TYPES.has(filters.transactionType)) {
    return { error: 'Choose a valid property journey' };
  }
  if (filters.propertyType && !PROPERTY_TYPES.has(filters.propertyType)) {
    return { error: 'Choose a valid property category' };
  }
  if (filters.rentalMode && !['short_term', 'long_term', 'both'].includes(filters.rentalMode)) {
    return { error: 'Choose a valid rental duration' };
  }
  if (filters.furnished && !['furnished', 'unfurnished', 'partially_furnished'].includes(filters.furnished)) {
    return { error: 'Choose a valid furnishing option' };
  }
  if (filters.verificationStatus && !['verified', 'unverified'].includes(filters.verificationStatus)) {
    return { error: 'Choose a valid agent verification filter' };
  }
  if (filters.pricePeriod && !Object.hasOwn(PRICE_COLUMNS, filters.pricePeriod)) {
    return { error: 'Choose a valid price period' };
  }
  if (filters.currency && !/^[A-Z]{3}$/.test(filters.currency)) {
    return { error: 'Choose a valid currency' };
  }
  if (!['new', 'price_low', 'price_high', 'popular', 'relevance'].includes(filters.sort)) {
    return { error: 'Choose a valid sort order' };
  }

  const numbers = {};
  for (const [name, options] of Object.entries({
    minPrice: {},
    maxPrice: {},
    minBedrooms: { integer: true },
    maxBedrooms: { integer: true },
    minBathrooms: {},
    minSize: {},
    maxSize: {}
  })) {
    const parsed = optionalNumber(input[name], options);
    if (parsed.error) return parsed;
    numbers[name] = parsed.value;
  }
  if (numbers.minPrice !== null && numbers.maxPrice !== null && numbers.minPrice > numbers.maxPrice) {
    return { error: 'Minimum price cannot exceed maximum price' };
  }
  if (numbers.minBedrooms !== null && numbers.maxBedrooms !== null && numbers.minBedrooms > numbers.maxBedrooms) {
    return { error: 'Minimum bedrooms cannot exceed maximum bedrooms' };
  }
  if (numbers.minSize !== null && numbers.maxSize !== null && numbers.minSize > numbers.maxSize) {
    return { error: 'Minimum size cannot exceed maximum size' };
  }

  const availableFrom = optionalDate(input.availableFrom);
  const availableTo = optionalDate(input.availableTo);
  if (availableFrom.error || availableTo.error) return { error: availableFrom.error || availableTo.error };
  if (Boolean(availableFrom.value) !== Boolean(availableTo.value)) {
    return { error: 'Choose both availability dates' };
  }
  if (availableFrom.value && availableFrom.value >= availableTo.value) {
    return { error: 'Availability end date must be after the start date' };
  }
  filters.availableFrom = availableFrom.value;
  filters.availableTo = availableTo.value;

  const hasPriceRange = numbers.minPrice !== null || numbers.maxPrice !== null;
  if (!filters.pricePeriod && hasPriceRange) {
    filters.pricePeriod = filters.transactionType === 'sale' ? 'sale'
      : filters.transactionType === 'rent' ? 'monthly'
        : filters.transactionType === 'stay' ? 'nightly'
          : '';
    if (!filters.pricePeriod) return { error: 'Choose whether the price is a sale, nightly, monthly, or yearly amount' };
  }
  if (filters.sort === 'price_low' || filters.sort === 'price_high') {
    if (!filters.pricePeriod) return { error: 'Choose a price period to sort comparable prices' };
  }
  if (filters.pricePeriod || hasPriceRange || filters.sort === 'price_low' || filters.sort === 'price_high') {
    filters.currency ||= 'TZS';
  }
  if (filters.currency && !/^[A-Z]{3}$/.test(filters.currency)) {
    return { error: 'Choose a valid currency' };
  }
  if (filters.transactionType === 'sale' && filters.pricePeriod && filters.pricePeriod !== 'sale') {
    return { error: 'Sale listings must use a sale price period' };
  }
  if (filters.transactionType === 'rent' && ['sale', 'nightly'].includes(filters.pricePeriod)) {
    return { error: 'Rent listings must use a monthly or yearly price period' };
  }
  if (filters.transactionType === 'stay' && filters.pricePeriod && filters.pricePeriod !== 'nightly') {
    return { error: 'Stay listings must use a nightly price period' };
  }

  const pageText = input.page === undefined || input.page === '' ? '1' : String(input.page);
  const limitText = input.limit === undefined || input.limit === '' ? String(defaultLimit) : String(input.limit);
  if (!/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) {
    return { error: 'Choose a valid results page and page size' };
  }
  const requestedPage = Number(pageText);
  const requestedLimit = Number(limitText);
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1
    || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    return { error: 'Choose a valid results page and page size' };
  }
  filters.page = Math.min(requestedPage, 10000);
  filters.limit = Math.min(requestedLimit, maxLimit);

  const where = ['l.status="published"', 'l.deleted_at IS NULL'];
  const params = [];
  const addLike = (column, value) => {
    if (!value) return;
    where.push(`${column} LIKE ?`);
    params.push(`%${value}%`);
  };
  if (filters.query) {
    const like = `%${filters.query}%`;
    where.push(`(${SEARCH_COLUMNS.map(column => `${column} LIKE ?`).join(' OR ')})`);
    params.push(...SEARCH_COLUMNS.map(() => like));
  }
  if (filters.location) {
    where.push('(l.city LIKE ? OR l.neighborhood LIKE ? OR l.region LIKE ? OR l.district LIKE ? OR l.ward LIKE ?)');
    const locationLike = `%${filters.location}%`;
    params.push(locationLike, locationLike, locationLike, locationLike, locationLike);
  }
  addLike('l.region', filters.region);
  addLike('l.district', filters.district);
  addLike('l.ward', filters.ward);
  addLike('l.neighborhood', filters.neighborhood);
  if (filters.rentalMode) {
    where.push('(l.rental_mode=? OR l.rental_mode="both")');
    params.push(filters.rentalMode);
  }
  if (filters.propertyType) {
    where.push('pt.name=?');
    params.push(filters.propertyType);
  }
  if (filters.transactionType) {
    where.push(filters.transactionType === 'rent' || filters.transactionType === 'stay'
      ? '(l.transaction_type=? OR l.transaction_type="both")'
      : 'l.transaction_type=?');
    params.push(filters.transactionType);
  }
  if (filters.pricePeriod) {
    const priceColumn = PRICE_COLUMNS[filters.pricePeriod];
    where.push(`${priceColumn} IS NOT NULL AND l.currency=?`);
    params.push(filters.currency);
    if (numbers.minPrice !== null) {
      where.push(`${priceColumn}>=?`);
      params.push(numbers.minPrice);
    }
    if (numbers.maxPrice !== null) {
      where.push(`${priceColumn}<=?`);
      params.push(numbers.maxPrice);
    }
  }
  if (numbers.minBedrooms !== null) {
    where.push('l.bedrooms>=?');
    params.push(numbers.minBedrooms);
  }
  if (numbers.maxBedrooms !== null) {
    where.push('l.bedrooms<=?');
    params.push(numbers.maxBedrooms);
  }
  if (numbers.minBathrooms !== null) {
    where.push('l.bathrooms>=?');
    params.push(numbers.minBathrooms);
  }
  if (numbers.minSize !== null) {
    where.push(`${SIZE_IN_SQUARE_METRES}>=?`);
    params.push(numbers.minSize);
  }
  if (numbers.maxSize !== null) {
    where.push(`${SIZE_IN_SQUARE_METRES}<=?`);
    params.push(numbers.maxSize);
  }
  if (filters.furnished) {
    where.push('l.furnished=?');
    params.push(filters.furnished);
  }
  if (filters.amenities.length) {
    where.push(`(
      SELECT COUNT(DISTINCT la.id)
      FROM listing_amenity_map lam JOIN listing_amenities la ON la.id=lam.amenity_id
      WHERE lam.listing_id=l.id AND la.name IN (${filters.amenities.map(() => '?').join(',')})
    )=?`);
    params.push(...filters.amenities, filters.amenities.length);
  }
  if (filters.availableFrom) {
    where.push(`l.transaction_type IN ("stay","both")
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.listing_id=l.id AND b.status IN ("pending","payment_pending","confirmed")
          AND b.check_in<? AND b.check_out>?
      )
      AND NOT EXISTS (
        SELECT 1 FROM listing_availability av
        WHERE av.listing_id=l.id AND av.status="blocked"
          AND av.available_from<? AND av.available_to>?
      )
      AND (
        NOT EXISTS (SELECT 1 FROM listing_availability av WHERE av.listing_id=l.id AND av.status="available")
        OR EXISTS (
          SELECT 1 FROM listing_availability av
          WHERE av.listing_id=l.id AND av.status="available"
            AND av.available_from<=? AND av.available_to>=?
        )
      )`);
    params.push(
      filters.availableTo,
      filters.availableFrom,
      filters.availableTo,
      filters.availableFrom,
      filters.availableFrom,
      filters.availableTo
    );
  }
  if (filters.verificationStatus) {
    const verifiedExpression = `EXISTS (
      SELECT 1 FROM identity_verifications iv
      WHERE iv.user_id=l.agent_user_id AND iv.status="approved"
        AND (iv.expires_at IS NULL OR iv.expires_at>=CURRENT_DATE())
    )`;
    where.push(filters.verificationStatus === 'verified' ? verifiedExpression : `NOT ${verifiedExpression}`);
  }

  const priceColumn = filters.pricePeriod ? PRICE_COLUMNS[filters.pricePeriod] : null;
  const orderBy = filters.sort === 'price_low' ? `${priceColumn} ASC, l.id DESC`
    : filters.sort === 'price_high' ? `${priceColumn} DESC, l.id DESC`
      : filters.sort === 'popular' ? 'l.average_rating DESC, l.review_count DESC, l.id DESC'
        : filters.sort === 'relevance' && filters.query
          ? 'CASE WHEN l.title LIKE ? THEN 0 WHEN l.neighborhood LIKE ? OR l.city LIKE ? THEN 1 ELSE 2 END ASC, l.published_at DESC, l.id DESC'
          : 'l.published_at DESC, l.created_at DESC, l.id DESC';

  return {
    filters,
    whereSql: where.join(' AND '),
    params,
    orderBy,
    orderParams: filters.sort === 'relevance' && filters.query
      ? [`%${filters.query}%`, `%${filters.query}%`, `%${filters.query}%`]
      : [],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit
  };
}
