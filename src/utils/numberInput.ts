export function normalizeNumericInput(raw: string): string {
  let value = raw
    .trim()
    .replace('.', ',')
    .replace(/[^0-9,+-]/g, '');

  if (value === '' || value === '-' || value === '+') return value;

  const sign = value.startsWith('-') ? '-' : '';
  value = value.replace(/[+-]/g, '');

  const commaIndex = value.indexOf(',');
  const hasComma = commaIndex >= 0;
  let integerPart = hasComma ? value.slice(0, commaIndex) : value;
  const fractionPart = hasComma ? value.slice(commaIndex + 1).replace(/,/g, '') : '';

  integerPart = integerPart.replace(/^0+(?=\d)/, '');

  if (integerPart === '' && hasComma) integerPart = '0';
  if (integerPart === '' && !hasComma) integerPart = '0';

  return `${sign}${integerPart}${hasComma ? `,${fractionPart}` : ''}`;
}

export function parseNumericInput(raw: string): number {
  const normalized = normalizeNumericInput(raw).replace(',', '.');
  if (normalized === '' || normalized === '-' || normalized === '+' || normalized === '.' || normalized === '-.') return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumericInput(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const normalized = Object.is(value, -0) ? 0 : value;
  return String(normalized).replace('.', ',');
}
