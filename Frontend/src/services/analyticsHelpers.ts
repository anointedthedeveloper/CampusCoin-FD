import { transactionService } from './transaction.service';
import { categoryService } from './category.service';
import type { CategoryType } from '@/types/category';
import type { Transaction } from '@/types/transaction';

/** Current month as 'YYYY-MM', or the month of a given date. */
export function monthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function previousMonthKey(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 2, 1); // monthNumber is 1-indexed; -2 lands on the prior month
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

export function transactionsInMonth(userId: string, month: string, type?: CategoryType): Transaction[] {
  return transactionService.list(userId, type ? { type } : {}).filter((txn) => txn.occurredAt.slice(0, 7) === month);
}

export function sumAmount(transactions: Transaction[]): number {
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

/** Maps category *name* (not id) to total amount, so callers don't need a second lookup pass. */
export function totalsByCategoryName(userId: string, month: string, type: CategoryType): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const txn of transactionsInMonth(userId, month, type)) {
    const name = categoryService.getById(userId, txn.categoryId)?.name ?? 'Other';
    totals[name] = (totals[name] ?? 0) + txn.amount;
  }
  return totals;
}

export interface MonthOverMonthDelta {
  direction: 'up' | 'down' | 'flat';
  /** Rounded absolute percentage change; 0 when there's nothing to compare against. */
  percent: number;
}

/** Real percent change vs. the previous month's value — never fabricated, and 0/flat when there's no prior data to compare. */
export function monthOverMonthDelta(current: number, previous: number): MonthOverMonthDelta {
  if (previous <= 0) {
    return { direction: 'flat', percent: 0 };
  }
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  if (current === previous) return { direction: 'flat', percent: 0 };
  return { direction: current > previous ? 'up' : 'down', percent };
}
