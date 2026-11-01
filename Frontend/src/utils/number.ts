// Helpers for amount inputs that show thousands separators while typing.

/** Strips everything but digits and one decimal point (max 2 decimals): "₦1,500.257" → "1500.25". */
export function normalizeNumericInput(value: string): string {
  const cleaned = value.replace(/,/g, '').replace(/[\u0080-\uFFFF]/g, '').replace(/[^0-9.]/g, '');
  const [integerPart = '', ...decimalParts] = cleaned.split('.');
  const integer = integerPart.replace(/^0+(?=\d)/, '') || (integerPart ? '0' : '');
  const decimal = decimalParts.join('').slice(0, 2);
  return cleaned.includes('.') ? `${integer}.${decimal}` : integer;
}

/** Adds thousands separators for display: "1500.5" → "1,500.5". */
export function formatNumericInput(value: string): string {
  const normalized = normalizeNumericInput(value);
  if (!normalized) return '';
  const [integer, decimal] = normalized.split('.');
  const grouped = Number(integer || 0).toLocaleString('en-US');
  return decimal !== undefined ? `${grouped}.${decimal}` : grouped;
}

/** The numeric value of a (possibly formatted) input string. */
export function parseNumericInput(value: string): number {
  return Number(normalizeNumericInput(value));
}
