import { useEffect, useState } from 'react';
import { ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import { Card } from '@/components/common';
import { transactionsApi, type TransactionRevision } from '@/api/transactions.api';
import { formatCurrency, formatDate } from '@/utils/format';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';

/** Transactions deleted in the last 30 days, each restorable in one click. */
export function RecentlyDeleted({ currency, refreshKey = 0, onRestored }: { currency: string; refreshKey?: number; onRestored: () => void }) {
  const [items, setItems] = useState<TransactionRevision[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    transactionsApi.recentlyDeleted().then((r) => { if (!cancelled) setItems(r); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!items.length) return null;

  async function restore(rev: TransactionRevision) {
    setBusy(rev.id);
    setMessage(null);
    try {
      await transactionsApi.restoreDeleted(rev.id);
      setItems((prev) => prev.filter((i) => i.id !== rev.id));
      setMessage('Transaction restored.');
      onRestored();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not restore it.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card noPadding>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-text-primary">
          <Trash2 className="h-4 w-4 text-gray-400" /> Recently deleted
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs text-gray-500 dark:bg-white/10 dark:text-text-muted">{items.length}</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-text-muted">Kept for 30 days <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} /></span>
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-white/[0.06]">
          {message && <p role="status" className="px-5 pt-3 text-xs font-medium text-brand-700 dark:text-primary-accent">{message}</p>}
          <ul className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {items.map((rev) => {
              const b = rev.before ?? {};
              return (
                <li key={rev.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-text-primary">{b.description || b.categoryName || 'Transaction'}</p>
                    <p className="text-xs text-gray-500 dark:text-text-muted">{b.categoryName} · {b.occurredAt ? formatDate(b.occurredAt) : ''} · deleted {formatDate(rev.at)}</p>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums', b.type === 'income' ? 'text-brand-700 dark:text-primary-accent' : 'text-gray-900 dark:text-text-primary')}>
                    {b.type === 'income' ? '+' : '−'}{formatCurrency(b.amount ?? 0, currency)}
                  </span>
                  <button type="button" disabled={busy !== null} onClick={() => void restore(rev)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5">
                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
