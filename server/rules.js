import crypto from 'node:crypto';
import { BlockList, isIP } from 'node:net';

const STRUCTURE_CATEGORIES = Object.freeze({
  house: 'house',
  apartment: 'apartment',
  room: 'room',
  land_plot: 'land',
  guesthouse: 'hotel',
  serviced_apartment: 'apartment',
  hotel: 'hotel',
  commercial: 'commercial'
});

function parseIpNetwork(value) {
  const parts = String(value || '').trim().split('/');
  if (parts.length > 2) return null;
  const address = parts[0];
  const version = isIP(address);
  if (!version) return null;
  const family = version === 4 ? 'ipv4' : 'ipv6';
  const maximumPrefix = version === 4 ? 32 : 128;
  let prefix = null;
  if (parts.length === 2) {
    if (!/^\d+$/.test(parts[1])) return null;
    prefix = Number(parts[1]);
    if (prefix > maximumPrefix) return null;
  }
  const blockList = new BlockList();
  if (prefix === null) blockList.addAddress(address, family);
  else blockList.addSubnet(address, prefix, family);
  return { blockList, family };
}

export function isValidIpNetwork(value) {
  return parseIpNetwork(value) !== null;
}

export function ipMatchesNetwork(address, network) {
  const parsed = parseIpNetwork(network);
  if (!parsed) return false;
  let candidate = String(address || '').trim();
  if (parsed.family === 'ipv4' && /^::ffff:/i.test(candidate)) candidate = candidate.slice(7);
  if (isIP(candidate) !== (parsed.family === 'ipv4' ? 4 : 6)) return false;
  return parsed.blockList.check(candidate, parsed.family);
}

export function resolvePropertyType(propertyType, structureType) {
  return String(propertyType || STRUCTURE_CATEGORIES[structureType] || 'apartment').trim().toLowerCase();
}

export function validateListingJourney({
  transactionType,
  propertyType,
  structureType,
  rentalMode,
  salePrice,
  nightlyPrice,
  monthlyPrice,
  yearlyPrice,
  plotSize,
  plotSizeUnit,
  landUse,
  titleStatus,
  floorArea,
  commercialUse
}) {
  const resolvedType = resolvePropertyType(propertyType, structureType);
  const allowedTypes = new Set(['apartment', 'house', 'room', 'commercial', 'land', 'hotel', 'short_stay']);
  if (!allowedTypes.has(resolvedType)) return { error: 'Choose a valid property category' };
  const mappedStructureType = STRUCTURE_CATEGORIES[String(structureType || '').trim().toLowerCase()];
  if (propertyType && mappedStructureType && String(propertyType).trim().toLowerCase() !== mappedStructureType) {
    return { error: 'The property category does not match the selected structure type' };
  }

  const modes = new Set(['short_term', 'long_term', 'both']);
  const explicitTransaction = transactionType !== undefined && transactionType !== null && String(transactionType).trim() !== '';
  const mode = rentalMode || (explicitTransaction && ['sale', 'rent'].includes(String(transactionType).trim().toLowerCase()) ? 'long_term' : 'short_term');
  if (!modes.has(mode)) return { error: 'Choose a valid rental duration' };

  const requestedTransaction = explicitTransaction
    ? String(transactionType).trim().toLowerCase()
    : mode === 'long_term' ? 'rent' : mode === 'both' ? 'both' : 'stay';
  if (!['sale', 'rent', 'stay', 'both'].includes(requestedTransaction)) {
    return { error: 'Choose Buy, Rent, Stay, or both rental terms' };
  }
  if (requestedTransaction === 'sale' && mode !== 'long_term') {
    return { error: 'Sale listings cannot use a stay or combined rental term' };
  }
  if (requestedTransaction === 'rent' && mode !== 'long_term') {
    return { error: 'Rent listings must use a long-term rental term' };
  }
  if (requestedTransaction === 'stay' && mode !== 'short_term') {
    return { error: 'Stay listings must use a short-term rental term' };
  }
  if (requestedTransaction === 'both' && mode !== 'both') {
    return { error: 'Choose both rental terms for a combined listing' };
  }
  if (['land', 'commercial'].includes(resolvedType) && ['stay', 'both'].includes(requestedTransaction)) {
    return { error: 'Land and commercial properties can only be listed for sale or long-term rent' };
  }

  const amount = value => value === undefined || value === null || value === '' ? null : Number(value);
  const prices = {
    salePrice: amount(salePrice),
    nightlyPrice: amount(nightlyPrice),
    monthlyPrice: amount(monthlyPrice),
    yearlyPrice: amount(yearlyPrice)
  };
  if (Object.values(prices).some(value => value !== null && (!Number.isFinite(value) || value <= 0))) {
    return { error: 'Enter valid prices greater than zero' };
  }
  if (requestedTransaction === 'sale') {
    if (prices.salePrice === null || prices.nightlyPrice !== null || prices.monthlyPrice !== null || prices.yearlyPrice !== null) {
      return { error: 'Buy listings require a sale price and cannot include rental prices' };
    }
  } else if (requestedTransaction === 'rent') {
    if (prices.salePrice !== null || prices.nightlyPrice !== null || (prices.monthlyPrice === null && prices.yearlyPrice === null)) {
      return { error: 'Rent listings require a monthly or yearly price only' };
    }
  } else if (requestedTransaction === 'stay') {
    if (prices.salePrice !== null || prices.nightlyPrice === null || prices.monthlyPrice !== null || prices.yearlyPrice !== null) {
      return { error: 'Stay listings require a nightly price only' };
    }
  } else if (
    prices.salePrice !== null
    || prices.nightlyPrice === null
    || (prices.monthlyPrice === null && prices.yearlyPrice === null)
  ) {
    return { error: 'Combined listings require a nightly price and a monthly or yearly price' };
  }

  const optionalNumber = (value, label) => {
    if (value === undefined || value === null || value === '') return { value: null };
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return { error: `${label} must be greater than zero` };
    return { value: number };
  };
  let land = { plotSize: null, plotSizeUnit: null, landUse: null, titleStatus: null };
  if (resolvedType === 'land') {
    const size = optionalNumber(plotSize, 'Plot size');
    if (size.error) return size;
    if (size.value === null || !['sqm', 'acres', 'hectares'].includes(plotSizeUnit) || !String(landUse || '').trim()) {
      return { error: 'Land listings require a plot size, unit, and land use' };
    }
    if (!['unknown', 'title_deed', 'offer', 'customary', 'other'].includes(titleStatus)) {
      return { error: 'Choose a valid land title status' };
    }
    land = {
      plotSize: size.value,
      plotSizeUnit,
      landUse: String(landUse || '').trim().slice(0, 120) || null,
      titleStatus
    };
  } else if ([plotSize, plotSizeUnit, landUse, titleStatus].some(value => value !== undefined && value !== null && value !== '')) {
    return { error: 'Land details can only be added to land listings' };
  }

  let commercial = { floorArea: null, commercialUse: null };
  if (resolvedType === 'commercial') {
    const area = optionalNumber(floorArea, 'Floor area');
    if (area.error) return area;
    if (area.value === null || !['office', 'retail', 'hospitality', 'warehouse', 'mixed_use', 'other'].includes(commercialUse)) {
      return { error: 'Commercial listings require a floor area and intended use' };
    }
    commercial = { floorArea: area.value, commercialUse };
  } else if ([floorArea, commercialUse].some(value => value !== undefined && value !== null && value !== '')) {
    return { error: 'Commercial details can only be added to commercial listings' };
  }

  return {
    transactionType: requestedTransaction,
    propertyType: resolvedType,
    rentalMode: requestedTransaction === 'sale' ? 'long_term' : mode,
    prices,
    ...land,
    ...commercial
  };
}

export function approximateListingCoordinates(latitude, longitude) {
  const lat = Number(latitude), lng = Number(longitude);
  if (latitude == null || longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng)
    || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const roundedLat = Number(lat.toFixed(2)), roundedLng = Number(lng.toFixed(2));
  return { latitude: roundedLat || 0, longitude: roundedLng || 0 };
}

export function withPublicListingCoordinates(listing) {
  const {
    approximate_latitude: approximateLatitude,
    approximate_longitude: approximateLongitude,
    latitude,
    longitude,
    ...publicListing
  } = listing;
  const coordinates = approximateListingCoordinates(
    approximateLatitude ?? latitude,
    approximateLongitude ?? longitude
  );
  return coordinates
    ? { ...publicListing, locationLatitude: coordinates.latitude, locationLongitude: coordinates.longitude }
    : publicListing;
}

export function datesOverlap(checkIn, checkOut, existingCheckIn, existingCheckOut) {
  return checkIn < existingCheckOut && checkOut > existingCheckIn;
}

export function calculateBooking({ nightlyPrice, cleaningFee = 0, checkIn, checkOut, minimumNights = 1 }) {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  const nights = Math.ceil((end - start) / 86400000);
  if (!Number.isFinite(nights) || nights < 1 || nights < minimumNights) {
    throw new Error('Invalid dates or minimum stay not met');
  }
  const subtotal = Number(nightlyPrice) * nights;
  return { nights, subtotal, total: subtotal + Number(cleaningFee) };
}

export function verifyWebhookSignature(payload, signature, secret) {
  if (!secret || typeof signature !== 'string') return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function hasRole(roles, requiredRole) {
  return Array.isArray(roles) && roles.includes(requiredRole);
}

export function hasAgentPermission(user, permission) {
  return hasRole(user?.roles, 'agent') && (
    !user.isSubAgent || (Array.isArray(user.permissions) && user.permissions.includes(permission))
  );
}

export function isActiveSubAgent(subaccount) {
  return subaccount?.status === 'active' && subaccount.userStatus === 'active';
}

export function isListingAvailable(requestedDates, lockedDates) {
  const locked = new Set(lockedDates);
  return requestedDates.every(date => !locked.has(date));
}
