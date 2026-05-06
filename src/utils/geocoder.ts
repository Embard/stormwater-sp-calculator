import type { PlaceMatch } from '../types';
import places from '../data/places.json';

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

export function searchLocalPlaces(query: string): PlaceMatch[] {
  const q = normalize(query);
  if (!q) return [];

  return (places as PlaceMatch[])
    .map((place) => {
      const haystack = normalize(`${place.name} ${place.region} ${place.district ?? ''}`);
      const exact = haystack.includes(q);
      const starts = normalize(place.name).startsWith(q);
      const confidence = exact ? (starts ? 0.98 : 0.88) : 0.4;
      return { place, confidence, exact };
    })
    .filter((x) => x.exact)
    .sort((a, b) => b.confidence - a.confidence)
    .map((x) => ({ ...x.place, confidence: x.confidence, source: 'local' as const }));
}
