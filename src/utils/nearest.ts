import type { PlaceMatch } from '../types';

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(a: Pick<PlaceMatch, 'lat' | 'lon'>, b: Pick<PlaceMatch, 'lat' | 'lon'>): number {
  const radiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}
