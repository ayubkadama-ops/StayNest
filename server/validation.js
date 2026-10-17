export function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function boundedPage(query, { defaultLimit = 40, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export function nonEmptyString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result && result.length <= maxLength ? result : null;
}

export function registrationDetails(body) {
  const value = (field, maxLength) => typeof body?.[field] === 'string' ? body[field].trim().slice(0, maxLength) : '';
  const phone = value('phone', 32);
  if (phone && !/^\+?[0-9][0-9\s().-]{6,24}$/.test(phone)) {
    return { phone, city: '', bio: '', agencyName: '', error: 'Enter a valid phone number' };
  }
  return {
    phone,
    city: value('city', 100),
    bio: value('bio', 5000),
    agencyName: value('agencyName', 160),
    error: ''
  };
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
