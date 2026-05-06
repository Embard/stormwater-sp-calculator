export function mmHaToM3(layerMm: number, areaHa: number): number {
  return 10 * layerMm * areaHa;
}

export function lPerM2HaToM3(rateLPerM2: number, areaHa: number): number {
  return 10 * rateLPerM2 * areaHa;
}

export function minutesFromLengthAndVelocity(lengthM: number, velocityMS: number): number {
  if (velocityMS <= 0) return 0;
  return lengthM / velocityMS / 60;
}
