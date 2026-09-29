import { useEffect, useState } from 'react';
import { Bot, FileUp, History, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Card, Spinner } from '@/components/common';
import { transactionsApi, type TransactionRevision, type TransactionSnapshot } from '@/api/transactions.api';
import { formatCurrency } from '@/utils/format';

const ICONS = { created: Plus, updated: Pencil, deleted: Trash2, restored: RotateCcw } as const;
const VIA_LABEL: Record<TransactionRevision['via'], string> = { app: '', ai: ' by the AI Assistant (you approved)', import: ' from an imported file', recurring: ' by a recurring schedule', restore: '' };

/** "amount ₦1,500 → ₦2,000, category Food → Transport" */
function describeChanges(before: TransactionSnapshot | null, after: TransactionSnapshot | null, currency: string): string[] {
  if (!before || !after) return [];
  const out: string[] = [];
  if (before.amount !== after.amount) out.push(`amount ${formatCurrency(before.amount ?? 0, currency)} → ${formatCurrency(after.amount ?? 0, currency)}`);
  if (before.categoryId !== after.categoryId) out.push(`category ${before.categoryName ?? '—'} → ${after.categoryName ?? '—'}`);
  if ((before.description ?? '') !== (after.description ?? '')) out.push(`description “${before.description ?? ''}” → “${after.description ?? ''}”`);
  if (before.occurredAt?.slice(0, 10) !== after.occurredAt?.slice(0, 10)) out.push(`date ${before.occurredAt?.slice(0, 10)} → ${after.occurredAt?.slice(0, 10)}`);
  if (before.type !== after.type) out.push(`type ${before.type} → ${after.type}`);
  return out;
}

/** Every change made to one transaction, newest first. */
export function TransactionHistory({ transactionId, currency, refreshKey = 0 }: { transactionId: string; currency: string; refreshKey?: number }) {
  const [revisions, setRevisions] = useState<TransactionRevision[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    transactionsApi.history(transactionId).then((r) => { if (!cancelled) setRevisions(r); }).catch(() => { if (!cancelled) setRevisions([]); });
    return () => { cancelled = true; };
  }, [transactionId, refreshKey]);

  return (
    <Card className="mt-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-text-primary"><History className="h-4 w-4 text-brand-600 dark:text-primary-accent" /> History</h2>
      {revisions === null ? (
        <div className="flex justify-center py-4"><Spinner size="md" /></div>
      ) : revisions.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-text-muted">No changes recorded yet. Edits you make from now on are kept here.</p>
      ) : (
        <ol className="mt-3 space-y-3 border-l border-gray-200 pl-4 dark:border-white/10">
          {revisions.map((r) => {
            const Icon = r.via === 'ai' ? Bot : r.via === 'import' ? FileUp : ICONS[r.action];
            const changes = describeChanges(r.before, r.after, currency);
            return (
              <li key={r.id} className="relative">
                <span className="absolute -left-[1.6rem] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 dark:bg-surface-elevated dark:ring-white/10"><Icon className="h-3 w-3 text-gray-500" /></span>
                <p className="text-sm font-medium capitalize text-gray-800 dark:text-text-primary">{r.action}{VIA_LABEL[r.via]}</p>
                {changes.length > 0 && <p className="text-xs text-gray-600 dark:text-text-secondary">{changes.join(' · ')}</p>}
                <p className="text-[11px] text-gray-400 dark:text-text-muted">{new Date(r.at).toLocaleString()}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
