import type { Transaction } from '@/types/transaction';

export type RecentKind = 'viewed' | 'edited';

export interface RecentTransactionEntry {
  id: string;
  kind: RecentKind;
  at: string;
  type: Transaction['type'];
  amount: number;
  description?: string;
  occurredAt: string;
}

const MAX_ENTRIES = 8;
const storageKey = (userId: string) => `campus-coin.recentTransactions.${userId}`;

/** Recently viewed/edited transactions for one student, newest first. Kept across sessions. */
export function getRecentTransactions(userId: string): RecentTransactionEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as RecentTransactionEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentTransaction(userId: string, tx: Transaction, kind: RecentKind): void {
  if (!tx?.id) return;
  const entry: RecentTransactionEntry = {
    id: tx.id,
    kind,
    at: new Date().toISOString(),
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    occurredAt: tx.occurredAt,
  };
  const next = [entry, ...getRecentTransactions(userId).filter((e) => e.id !== tx.id)].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    // Storage full or unavailable — the list is a convenience only.
  }
}

export function forgetRecentTransaction(userId: string, id: string): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(getRecentTransactions(userId).filter((e) => e.id !== id)));
  } catch {
    // ignore
  }
}
