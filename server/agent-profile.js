export const AGENT_SPECIALIZATIONS = Object.freeze([
  'residential_sales',
  'long_term_rentals',
  'short_stays',
  'land',
  'commercial',
  'property_management'
]);

function parseJsonList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeAgentSpecializations(value) {
  const values = parseJsonList(value);
  const selected = [...new Set(values.filter(item => typeof item === 'string').map(item => item.trim()))];
  if (selected.some(item => !AGENT_SPECIALIZATIONS.includes(item))) {
    return { error: 'Choose only the listed professional specializations' };
  }
  if (selected.length > AGENT_SPECIALIZATIONS.length) {
    return { error: 'Choose no more than six professional specializations' };
  }
  return { value: selected };
}

export function normalizeAgentServiceAreas(value) {
  const values = parseJsonList(value);
  if (values.some(item => typeof item !== 'string')) {
    return { error: 'Service areas must be a list of place names' };
  }
  const unique = new Map();
  for (const item of values) {
    const area = item.trim().replace(/\s+/g, ' ');
    if (!area) continue;
    if (area.length > 100) return { error: 'Each service area must be 100 characters or fewer' };
    const key = area.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, area);
  }
  const serviceAreas = [...unique.values()];
  if (serviceAreas.length > 20) return { error: 'Choose no more than 20 service areas' };
  return { value: serviceAreas };
}

export function parseAgentProfileList(value) {
  return parseJsonList(value).filter(item => typeof item === 'string');
}
