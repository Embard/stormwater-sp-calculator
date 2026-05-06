export function reserveRangeByMode(mode: 'regulation-only' | 'regulation-and-settling'): { min: number; max: number } {
  return mode === 'regulation-only' ? { min: 5, max: 10 } : { min: 35, max: 45 };
}
