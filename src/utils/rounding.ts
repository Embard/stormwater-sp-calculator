export function round(value: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round((value + Number.EPSILON) * p) / p;
}

export function roundArea(value: number): number {
  return round(value, 4);
}

export function roundCoeff(value: number): number {
  return round(value, 4);
}

export function roundVolume(value: number, annual = false): number {
  return annual ? Math.round(value) : round(value, 1);
}

export function roundFlowLS(value: number): number {
  return value > 10 ? round(value, 1) : round(value, 2);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}
