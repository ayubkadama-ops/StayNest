export async function geocodeAddress(address) {
  if (!address || address.length > 240) throw new Error('A valid address is required');
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'StayNest/1.0 contact: support@staynest.example' }
  });
  if (!response.ok) throw new Error(`Geocoding provider returned ${response.status}`);
  const results = await response.json();
  if (!results[0]) return null;
  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);
  return {
    latitude,
    longitude,
    displayName: results[0].display_name,
    mapUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
  };
}
