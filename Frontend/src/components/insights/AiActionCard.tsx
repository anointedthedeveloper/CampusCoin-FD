import { useState } from 'react';
import { Check, CircleDollarSign, FolderPlus, Loader2, PencilLine, PiggyBank, Target, Trash2, UserCog, Wallet, X } from 'lucide-react';
import type { AIAction, AIActionKind } from '@/api/ai.api';
import { cn } from '@/utils/cn';

const KIND_META: Record<AIActionKind, { icon: typeof Check; label: string; tone: string }> = {
  add_transaction: { icon: CircleDollarSign, label: 'New transaction', tone: 'bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent' },
  update_transaction: { icon: PencilLine, label: 'Edit transaction', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400' },
  delete_transaction: { icon: Trash2, label: 'Delete transaction', tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  set_budget: { icon: Wallet, label: 'Budget', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400' },
  add_savings_goal: { icon: Target, label: 'New savings goal', tone: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-400' },
  contribute_goal: { icon: PiggyBank, label: 'Savings goal', tone: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-400' },
  add_category: { icon: FolderPlus, label: 'New category', tone: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-400' },
  update_profile: { icon: UserCog, label: 'Profile', tone: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-text-secondary' },
};

interface Props {
  actions: AIAction[];
  onApply: (action: AIAction) => Promise<void>;
  onReject: (action: AIAction) => Promise<void>;
  onApplyAll: () => Promise<void>;
}

/** Changes the assistant prepared, each waiting for the student's OK. */
export function AiActionCards({ actions, onApply, onReject, onApplyAll }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const pending = actions.filter((a) => a.status === 'pending');

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  }

  return (
    <div className="mt-3 space-y-2" aria-label="Proposed changes">
      {actions.map((action) => {
        const meta = KIND_META[action.kind];
        const Icon = meta.icon;
        return (
          <div key={action.id} className={cn('rounded-xl border bg-white p-3 shadow-sm dark:bg-surface', action.status === 'pending' ? 'border-brand-200 dark:border-primary/30' : 'border-gray-100 dark:border-white/[0.06]')}>
            <div className="flex items-start gap-2.5">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.tone)}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-text-muted">{meta.label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-text-primary">{action.summary}</p>
                {action.status === 'applied' && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-primary-accent"><Check className="h-3.5 w-3.5" /> {action.result?.message ?? 'Saved'}</p>}
                {action.status === 'rejected' && <p className="mt-1 text-xs text-gray-500 dark:text-text-muted">Not applied</p>}
                {action.status === 'failed' && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Couldn’t save: {action.error}</p>}
              </div>
            </div>
            {action.status === 'pending' && (
              <div className="mt-2.5 flex gap-2 pl-[2.625rem]">
                <button type="button" disabled={busy !== null} onClick={() => void run(action.id, () => onApply(action))} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-primary dark:hover:bg-primary-accent">
                  {busy === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                </button>
                <button type="button" disabled={busy !== null} onClick={() => void run(`${action.id}-x`, () => onReject(action))} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5">
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
      {pending.length > 1 && (
        <button type="button" disabled={busy !== null} onClick={() => void run('all', onApplyAll)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-primary dark:hover:bg-primary-accent">
          {busy === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve all {pending.length}
        </button>
      )}
    </div>
  );
}
