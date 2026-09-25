import type { CategoryType } from '@/types/category';

/** Current month as 'YYYY-MM', or the month of a given date. */
export function monthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function previousMonthKey(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return monthKey(date);
}

export function monthsBefore(month: string, count: number): string[] {
  const result: string[] = [];
  let cursor = month;
  for (let i = 0; i < count; i += 1) {
    cursor = previousMonthKey(cursor);
    result.unshift(cursor);
  }
  return result;
}

export function sumAmount(transactions: { amount: number }[]): number {
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

export interface MonthOverMonthDelta {
  direction: 'up' | 'down' | 'flat';
  percent: number;
}

export function monthOverMonthDelta(current: number, previous: number): MonthOverMonthDelta {
  if (previous <= 0) return { direction: 'flat', percent: 0 };
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  if (current === previous) return { direction: 'flat', percent: 0 };
  return { direction: current > previous ? 'up' : 'down', percent };
}

// transactionsInMonth and totalsByCategoryName removed — they called async
// services synchronously. Use reportService.getMonthlyReport() instead.
export type { CategoryType };
