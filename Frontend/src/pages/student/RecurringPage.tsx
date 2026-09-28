import { useEffect, useState, type FormEvent } from 'react';
import { Pause, Play, Plus, Repeat, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, PageSpinner } from '@/components/common';
import { recurringApi } from '@/api/recurring.api';
import { categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate } from '@/utils/format';
import { formatNumericInput, normalizeNumericInput } from '@/utils/number';
import { cn } from '@/utils/cn';
import { ApiError } from '@/types/api';
import type { Category, CategoryType } from '@/types/category';
import type { RecurringEntry, RecurringFrequency } from '@/types/recurring';

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const fieldCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:[color-scheme:dark]';

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function RecurringPage() {
  const { user } = useAuth();
  const currency = user?.settings?.currency ?? DEFAULT_CURRENCY;
  const [entries, setEntries] = useState<RecurringEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const showLoader = useMinLoadTime(isLoading);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<RecurringEntry | null>(null);

  const [type, setType] = useState<CategoryType>('income');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([recurringApi.list(), categoryService.list(user.id)]).then(([list, cats]) => {
      if (cancelled) return;
      setEntries(list.status === 'fulfilled' ? list.value : []);
      setCategories(cats.status === 'fulfilled' ? cats.value : []);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id, refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Category';
  const typeCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (!categoryId) { setError('Choose a category.'); return; }
    if (endDate && endDate < startDate) { setError('The end date must be after the start date.'); return; }
    setIsSubmitting(true);
    try {
      await recurringApi.create({
        type,
        amount: parsed,
        categoryId,
        description: description.trim() || undefined,
        frequency,
        startDate,
        endDate: endDate || null,
      });
      // Post the first occurrence right away if it is due today or earlier.
      await recurringApi.processDue().catch(() => 0);
      setAmount('');
      setDescription('');
      setEndDate('');
      setIsFormOpen(false);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this recurring entry.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(entry: RecurringEntry) {
    await recurringApi.update(entry.id, { isActive: !entry.isActive });
    setRefreshToken((t) => t + 1);
  }

  const monthlyIncome = entries
    .filter((e) => e.isActive && e.type === 'income')
    .reduce((sum, e) => sum + monthlyEquivalent(e), 0);
  const monthlyExpense = entries
    .filter((e) => e.isActive && e.type === 'expense')
    .reduce((sum, e) => sum + monthlyEquivalent(e), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Recurring Entries</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Income and expenses that repeat — like a monthly allowance or a subscription — are logged for you automatically.
          </p>
        </div>
        <Button variant="primary" onClick={() => { setIsFormOpen((o) => !o); setError(null); }}>
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'New recurring entry'}
        </Button>
      </div>

      {deleting && (
        <ConfirmDialog
          open
          title="Delete this recurring entry?"
          description="Future occurrences will stop. Transactions already logged are kept."
          confirmLabel="Delete"
          onConfirm={async () => {
            await recurringApi.remove(deleting.id);
            setRefreshToken((t) => t + 1);
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      {isFormOpen && (
        <Card className="animate-fade-in-up">
          <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/[0.08]">
            {(['income', 'expense'] as CategoryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId(''); }}
                className={cn(
                  'rounded-md px-5 py-1.5 text-sm font-semibold capitalize transition-all',
                  type === t ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary' : 'text-gray-500 dark:text-text-muted',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-text-secondary">
              Amount ({currency})
              <input inputMode="decimal" required value={formatNumericInput(amount)} onChange={(e) => setAmount(normalizeNumericInput(e.target.value))} placeholder="0.00" className={cn(fieldCls, 'mt-1.5')} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-text-secondary">
              Category
              <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cn(fieldCls, 'mt-1.5')}>
                <option value="" disabled>Select a category</option>
                {typeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-text-secondary sm:col-span-2">
              Description <span className="font-normal text-gray-400 dark:text-text-muted">(optional)</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} placeholder={type === 'income' ? 'e.g. Allowance from parents' : 'e.g. Netflix subscription'} className={cn(fieldCls, 'mt-1.5')} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-text-secondary">
              Repeats
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)} className={cn(fieldCls, 'mt-1.5')}>
                {(Object.keys(FREQUENCY_LABEL) as RecurringFrequency[]).map((f) => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-text-secondary">
              First date
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(fieldCls, 'mt-1.5')} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-text-secondary">
              End date <span className="font-normal text-gray-400 dark:text-text-muted">(optional)</span>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={cn(fieldCls, 'mt-1.5')} />
            </label>
            <div className="flex items-end justify-end sm:col-span-1">
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full sm:w-auto">Save recurring entry</Button>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}
          </form>
        </Card>
      )}

      {showLoader ? (
        <PageSpinner label="Loading recurring entries…" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring entries yet"
          description="Add your allowance, rent or subscriptions once and Campus Coin logs them on schedule."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <p className="text-xs text-gray-500 dark:text-text-muted">Recurring income (per month)</p>
              <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(monthlyIncome, currency)}</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500 dark:text-text-muted">Recurring expenses (per month)</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-text-primary">{formatCurrency(monthlyExpense, currency)}</p>
            </Card>
          </div>
          <Card noPadding>
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {entries.map((entry) => (
                <div key={entry.id} className={cn('flex flex-wrap items-center gap-3 px-5 py-4', !entry.isActive && 'opacity-60')}>
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', entry.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400')}>
                    <Repeat className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{entry.description || categoryName(entry.categoryId)}</p>
                    <p className="text-xs text-gray-500 dark:text-text-muted">
                      {categoryName(entry.categoryId)} · {FREQUENCY_LABEL[entry.frequency]}
                      {entry.isActive ? ` · next ${formatDate(entry.nextRunAt)}` : ' · paused'}
                      {entry.endDate ? ` · ends ${formatDate(entry.endDate)}` : ''}
                    </p>
                  </div>
                  <Badge tone={entry.type === 'income' ? 'success' : 'neutral'}>{entry.type}</Badge>
                  <span className="w-28 text-right text-sm font-bold text-gray-900 dark:text-text-primary">{formatCurrency(entry.amount, currency)}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => void toggleActive(entry)} aria-label={entry.isActive ? 'Pause' : 'Resume'} title={entry.isActive ? 'Pause' : 'Resume'} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/5">
                      {entry.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => setDeleting(entry)} aria-label="Delete" title="Delete" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function monthlyEquivalent(entry: RecurringEntry): number {
  const per = entry.interval || 1;
  switch (entry.frequency) {
    case 'daily': return (entry.amount * 30) / per;
    case 'weekly': return (entry.amount * 52) / 12 / per;
    case 'monthly': return entry.amount / per;
    default: return entry.amount / 12 / per;
  }
}
