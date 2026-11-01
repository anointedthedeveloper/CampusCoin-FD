// Display formatting for money, dates and month labels.

/** e.g. formatCurrency(1500, 'NGN') → "₦1,500.00". */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
}

/**
 * Returns just the narrow symbol for a currency code, e.g. 'NGN' → '₦', 'USD' → '$'.
 * Used for input adornments where the full formatted number isn't needed.
 */
export function getCurrencySymbol(currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? currency;
}

/** e.g. "Sep 12, 2026". */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(isoDate));
}

/** "2026-09" → "September 2026". */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, (monthNumber ?? 1) - 1),
  );
}

/** "2026-09" → "Sep". */
export function formatMonthShortLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(year, (monthNumber ?? 1) - 1));
}
