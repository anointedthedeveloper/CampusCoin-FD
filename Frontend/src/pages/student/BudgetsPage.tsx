import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, PiggyBank, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button, Card, EmptyState, Spinner } from '@/components/common';
import { BudgetProgressRow } from '@/components/budgets/BudgetProgressRow';
import { budgetService, categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { formatMonthLabel } from '@/utils/format';
import { ApiError } from '@/types/api';
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
  const [monthOffset, setMonthOffset] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const month = monthForOffset(monthOffset);
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

  const categoryNameFor = (id: string) => expenseCategories.find((c) => c.id === id)?.name ?? 'Other';
  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = expenseCategories.filter((c) => !budgetedCategoryIds.has(c.id));

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
    const confirmed = window.confirm(`Remove the ${categoryNameFor(budget.categoryId)} budget for ${displayMonth}?`);
    if (!confirmed) return;
    await budgetService.remove(user.id, budget.id);
    setNotice(`Removed the ${categoryNameFor(budget.categoryId)} budget.`);
    setRefreshToken((t) => t + 1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError(null);

    const parsedAmount = Number(limitAmount);
    if (!parsedAmount || parsedAmount <= 0) { setError('Enter a limit amount greater than zero.'); return; }
    if (!editingBudget && !categoryId) { setError('Choose a category.'); return; }

    setIsSubmitting(true);
    try {
      if (editingBudget) {
        await budgetService.update(user.id, editingBudget.id, parsedAmount);
        setNotice(`Updated the ${categoryNameFor(editingBudget.categoryId)} budget.`);
      } else {
        await budgetService.create(user.id, { categoryId, month, limitAmount: parsedAmount });
        setNotice(`Set a budget for ${categoryNameFor(categoryId)}.`);
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

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Budget</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Set and track your spending limits.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => { if (isFormOpen) { closeForm(); } else { openNewForm(); } }}
          disabled={!editingBudget && !isFormOpen && availableCategories.length === 0}
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'Set Budget'}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => { setMonthOffset((v) => v - 1); closeForm(); }} aria-label="Previous month" className="rounded-lg p-1.5 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-text-primary">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-text-primary">{displayMonth}</span>
        <button onClick={() => { setMonthOffset((v) => v + 1); closeForm(); }} aria-label="Next month" className="rounded-lg p-1.5 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-text-primary">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {notice && <p className="text-center text-sm text-brand-700 dark:text-primary-accent">{notice}</p>}

      {isFormOpen && (
        <Card className="animate-fade-in-up p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="budget-category" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Category</label>
              <select
                id="budget-category"
                required
                disabled={Boolean(editingBudget)}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 dark:border-border dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent dark:focus:ring-primary-accent dark:disabled:bg-white/5 dark:disabled:text-text-muted"
              >
                <option value="" disabled>Select a category</option>
                {(editingBudget ? expenseCategories : availableCategories).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="budget-limit" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Monthly limit</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400 dark:text-text-muted">₦</span>
                <input
                  id="budget-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 15000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-border dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent dark:focus:ring-primary-accent"
                />
              </div>
            </div>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingBudget ? 'Save Changes' : 'Save Budget'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={PiggyBank}
            title="No budgets set for this month"
            description={expenseCategories.length === 0 ? 'Create an expense category first, then set a budget for it.' : 'Set a monthly limit for a category to start tracking your spending against it.'}
          />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {budgets.map((budget) => (
              <div key={budget.id} className="group flex items-center gap-2">
                <div className="flex-1">
                  <BudgetProgressRow budget={budget} categoryName={categoryNameFor(budget.categoryId)} />
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button type="button" onClick={() => openEditForm(budget)} className="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:text-text-muted dark:hover:bg-white/10 dark:hover:text-text-primary" aria-label={`Edit ${categoryNameFor(budget.categoryId)} budget`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void handleDelete(budget)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400" aria-label={`Delete ${categoryNameFor(budget.categoryId)} budget`}>
                    <Trash2 className="h-4 w-4" />
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
