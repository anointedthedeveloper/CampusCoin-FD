import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Pencil, PiggyBank, Plus, Trash2, X } from 'lucide-react';
import { Button, Card, EmptyState, PageSpinner } from '@/components/common';
import { BudgetProgressRow } from '@/components/budgets/BudgetProgressRow';
import { budgetService, categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatMonthLabel } from '@/utils/format';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { Budget } from '@/types/budget';
import type { Category } from '@/types/category';

function monthForOffset(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function BudgetsPage() {
  const { user } = useAuth();
  const [monthOffset, setMonthOffset]   = useState(0);
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId]     = useState('');
  const [limitAmount, setLimitAmount]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [notice, setNotice]             = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [budgets, setBudgets]           = useState<Budget[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  const month        = monthForOffset(monthOffset);
  const displayMonth = formatMonthLabel(month);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    async function load() {
      const [cats, buds] = await Promise.all([
        categoryService.list(user!.id, 'expense'),
        budgetService.list(user!.id, month),
      ]);
      setExpenseCategories(cats);
      setBudgets(buds);
      setIsLoading(false);
    }
    void load();
  }, [user, month, refreshToken]);

  const categoryNameFor       = (id: string) => expenseCategories.find((c) => c.id === id)?.name ?? 'Other';
  const budgetedCategoryIds   = new Set(budgets.map((b) => b.categoryId));
  const availableCategories   = expenseCategories.filter((c) => !budgetedCategoryIds.has(c.id));

  // Summary totals
  const totalBudgeted = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent    = budgets.reduce((s, b) => s + b.spentAmount, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  function openNewForm() {
    setEditingBudget(null);
    setCategoryId(availableCategories[0]?.id ?? '');
    setLimitAmount('');
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(budget: Budget) {
    setEditingBudget(budget);
    setCategoryId(budget.categoryId);
    setLimitAmount(String(budget.limitAmount));
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingBudget(null);
    setError(null);
  }

  async function handleDelete(budget: Budget) {
    if (!user) return;
    if (!window.confirm(`Remove the ${categoryNameFor(budget.categoryId)} budget for ${displayMonth}?`)) return;
    await budgetService.remove(user.id, budget.id);
    setNotice(`Removed the ${categoryNameFor(budget.categoryId)} budget.`);
    setRefreshToken((t) => t + 1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError(null);
    const parsedAmount = Number(limitAmount);
    if (!parsedAmount || parsedAmount <= 0) { setError('Enter a limit greater than zero.'); return; }
    if (!editingBudget && !categoryId) { setError('Choose a category.'); return; }
    setIsSubmitting(true);
    try {
      if (editingBudget) {
        await budgetService.update(user.id, editingBudget.id, parsedAmount);
        setNotice(`Updated the ${categoryNameFor(editingBudget.categoryId)} budget.`);
      } else {
        await budgetService.create(user.id, { categoryId, month, limitAmount: parsedAmount });
        setNotice(`Budget set for ${categoryNameFor(categoryId)}.`);
      }
      budgetService.checkAndNotify(user.id, month);
      setRefreshToken((t) => t + 1);
      closeForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this budget. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Budgets</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">Set and track your monthly spending limits.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => { if (isFormOpen) closeForm(); else openNewForm(); }}
          disabled={!editingBudget && !isFormOpen && availableCategories.length === 0}
        >
          {isFormOpen ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Set Budget</>}
        </Button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => { setMonthOffset((v) => v - 1); closeForm(); }}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/8 dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5 dark:hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[8rem] text-center text-sm font-semibold text-gray-900 dark:text-text-primary">
          {displayMonth}
        </span>
        <button
          onClick={() => { setMonthOffset((v) => v + 1); closeForm(); }}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/8 dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5 dark:hover:text-text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Month summary */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Budgeted', value: formatCurrency(totalBudgeted, DEFAULT_CURRENCY), color: 'text-gray-900 dark:text-text-primary' },
            { label: 'Spent',    value: formatCurrency(totalSpent, DEFAULT_CURRENCY),    color: 'text-gray-900 dark:text-text-primary' },
            {
              label: totalRemaining >= 0 ? 'Remaining' : 'Over budget',
              value: formatCurrency(Math.abs(totalRemaining), DEFAULT_CURRENCY),
              color: totalRemaining >= 0 ? 'text-brand-600 dark:text-primary-accent' : 'text-red-600 dark:text-red-400',
            },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-text-secondary">{label}</p>
              <p className={cn('mt-1 text-lg font-bold tabular-nums', color)}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Notice */}
      {notice && (
        <p className="text-center text-sm font-medium text-brand-700 dark:text-primary-accent">{notice}</p>
      )}

      {/* Add / edit form */}
      {isFormOpen && (
        <Card className="animate-fade-in-up">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-text-primary">
            {editingBudget ? `Edit ${categoryNameFor(editingBudget.categoryId)} Budget` : 'New Budget'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Category */}
            <div className="flex-1">
              <label htmlFor="budget-category" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Category
              </label>
              <select
                id="budget-category"
                required
                disabled={Boolean(editingBudget)}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-inset',
                  'border-gray-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                  'dark:border-white/8 dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                <option value="" disabled>Select a category</option>
                {(editingBudget ? expenseCategories : availableCategories).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Limit */}
            <div className="flex-1">
              <label htmlFor="budget-limit" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Monthly limit
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-gray-400 dark:text-text-muted">
                  ₦
                </span>
                <input
                  id="budget-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 15000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border bg-white py-2.5 pl-8 pr-3.5 text-sm text-gray-900 shadow-inset',
                    'border-gray-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                    'dark:border-white/8 dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70',
                  )}
                />
              </div>
            </div>

            <Button type="submit" variant="primary" isLoading={isSubmitting} className="sm:self-end">
              {editingBudget ? 'Save Changes' : 'Save Budget'}
            </Button>
          </form>
          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </Card>
      )}

      {/* Budget list */}
      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title="No budgets set for this month"
            description={
              expenseCategories.length === 0
                ? 'Create an expense category first, then set a budget for it.'
                : 'Set a monthly limit per category to track spending against it.'
            }
          />
        </Card>
      ) : (
        <Card noPadding>
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {budgets.map((budget) => (
              <div key={budget.id} className="group relative px-5">
                <BudgetProgressRow budget={budget} categoryName={categoryNameFor(budget.categoryId)} />

                {/* Action buttons fade in on hover */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEditForm(budget)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:hover:bg-white/8 dark:hover:text-text-primary"
                    aria-label={`Edit ${categoryNameFor(budget.categoryId)} budget`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(budget)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    aria-label={`Delete ${categoryNameFor(budget.categoryId)} budget`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
