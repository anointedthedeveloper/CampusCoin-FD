import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Plus, Sparkles } from 'lucide-react';
import { Button, Card } from '@/components/common';
import { STUDENT_ROUTES } from '@/constants/routes';
import { EXPENSE_CATEGORY_ICONS, INCOME_CATEGORY_ICONS } from '@/constants/categoryIcons';
import { categoryService, transactionService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { ApiError } from '@/types/api';
import type { Category, CategoryType } from '@/types/category';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const fieldCls = cn(
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-inset',
  'border-gray-200 hover:border-gray-300',
  'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
  'dark:border-white/8 dark:bg-surface dark:text-text-primary',
  'dark:hover:border-white/15 dark:focus:border-primary-accent/70 dark:focus:ring-primary-accent/20',
);

export function TransactionNewPage() {
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const initialType      = searchParams.get('type') === 'expense' ? 'expense' : 'income';

  const [type, setType]             = useState<CategoryType>(initialType);
  const [amount, setAmount]         = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate]             = useState(todayIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    categoryService.list(user.id, type).then(setCategories).catch(() => setCategories([]));
  }, [user?.id, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const quickIcons = type === 'income' ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;

  function handleTypeChange(next: CategoryType) {
    setType(next);
    setCategoryId('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (!categoryId) { setError('Choose a category.'); return; }
    setIsSubmitting(true);
    try {
      await transactionService.create(user.id, {
        type, amount: parsed, categoryId,
        description: description.trim() || undefined,
        occurredAt: new Date(date).toISOString(),
      });
      navigate(STUDENT_ROUTES.transactions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Back + title */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors dark:text-text-muted dark:hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-text-primary">
          Add {type === 'income' ? 'Income' : 'Expense'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          Log a new {type === 'income' ? 'income source' : 'expense'} to keep your records up to date.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* ── Main form ── */}
        <Card className="md:col-span-2">
          {/* Income / Expense toggle */}
          <div className="mb-5 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/8">
            {(['income', 'expense'] as CategoryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={cn(
                  'rounded-md px-5 py-1.5 text-sm font-semibold capitalize transition-all duration-150',
                  type === t
                    ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-text-secondary',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Amount <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-gray-400 dark:text-text-muted">₦</span>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(fieldCls, 'pl-8 text-lg font-semibold')}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Category <span className="text-brand-500">*</span>
              </label>
              <select
                id="category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={fieldCls}
              >
                <option value="" disabled>Select a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Description
                <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-text-muted">optional</span>
              </label>
              <input
                id="description"
                type="text"
                placeholder={type === 'income' ? 'e.g. Monthly allowance from parents' : 'e.g. Campus Cafe lunch'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldCls}
              />
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Date <span className="text-brand-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cn(fieldCls, 'dark:[color-scheme:dark]')}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              loadingText="Saving…"
            >
              Save {type === 'income' ? 'Income' : 'Expense'}
            </Button>
          </form>
        </Card>

        {/* ── Category picker sidebar ── */}
        <Card className="h-fit">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Quick Select</h2>
          </div>
          <div className="space-y-1.5">
            {categories.map((c) => {
              const quick = quickIcons[c.name];
              const Icon  = quick?.icon ?? MoreHorizontal;
              const isSelected = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium',
                    'transition-all duration-150',
                    isSelected
                      ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-sm dark:border-primary-accent/40 dark:bg-primary/10 dark:text-primary-accent'
                      : 'border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50 dark:border-white/5 dark:text-text-secondary dark:hover:border-white/10 dark:hover:bg-white/[0.03]',
                  )}
                >
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isSelected
                      ? (quick?.badgeClassName ?? 'bg-brand-100 text-brand-600')
                      : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-text-secondary',
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{c.name}</span>
                  {isSelected && (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-brand-500 dark:bg-primary-accent" />
                  )}
                </button>
              );
            })}

            <Link
              to={STUDENT_ROUTES.categories}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-left text-sm font-medium text-gray-400 transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-white/8 dark:text-text-muted dark:hover:border-primary-accent/30 dark:hover:text-primary-accent"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 dark:bg-white/5">
                <Plus className="h-4 w-4" />
              </span>
              Add Custom Category
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
