import crypto from 'node:crypto';

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

export function isListingAvailable(requestedDates, lockedDates) {
  const locked = new Set(lockedDates);
  return requestedDates.every(date => !locked.has(date));
}
