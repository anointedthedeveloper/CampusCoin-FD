import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Card, EmptyState, PageSpinner } from '@/components/common';
import { DEFAULT_CATEGORY_ICON, EXPENSE_CATEGORY_ICONS, INCOME_CATEGORY_ICONS } from '@/constants/categoryIcons';
import { categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { ApiError } from '@/types/api';
import type { Category, CategoryType } from '@/types/category';

function iconFor(category: Category) {
  const map = category.type === 'income' ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;
  return map[category.name] ?? DEFAULT_CATEGORY_ICON;
}

function CategoryGrid({ categories, onDelete }: { categories: Category[]; onDelete: (c: Category) => void }) {
  if (categories.length === 0) {
    return (
      <EmptyState compact icon={Plus} title="No categories yet" description="Add one with the button above." />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const { icon: Icon, badgeClassName } = iconFor(cat);
        return (
          <div
            key={cat.id}
            className={cn(
              'group flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
              'bg-white border-gray-100 shadow-card',
              'transition-all duration-200 hover:-translate-y-px hover:shadow-card-hover hover:border-gray-200',
              'dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-dark-card dark:hover:border-white/10',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', badgeClassName)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{cat.name}</p>
                {cat.isDefault && (
                  <p className="text-2xs font-medium text-gray-400 dark:text-text-muted">Default</p>
                )}
              </div>
            </div>
            {!cat.isDefault && (
              <button
                type="button"
                onClick={() => onDelete(cat)}
                className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CategoriesPage() {
  const { user }             = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName]      = useState('');
  const [type, setType]      = useState<CategoryType>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]    = useState<string | null>(null);
  const [notice, setNotice]  = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading]   = useState(true);

  async function loadCategories() {
    if (!user) return;
    const cats = await categoryService.list(user.id).catch(() => [] as Category[]);
    setCategories(cats);
    setIsLoading(false);
  }

  useEffect(() => { void loadCategories(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories  = categories.filter((c) => c.type === 'income');

  async function handleDelete(category: Category) {
    if (!user) return;
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    const { reassignedCount } = await categoryService.remove(user.id, category.id);
    setNotice(
      reassignedCount > 0
        ? `Deleted "${category.name}" — ${reassignedCount} transaction${reassignedCount === 1 ? '' : 's'} moved to the fallback category.`
        : `Deleted "${category.name}".`,
    );
    void loadCategories();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await categoryService.create(user.id, { name: name.trim(), type });
      setName('');
      setIsFormOpen(false);
      void loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this category. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Categories</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Manage the categories used across your transactions and budgets.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => { setIsFormOpen((o) => !o); setError(null); }}
        >
          {isFormOpen ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Category</>}
        </Button>
      </div>

      {/* Notice */}
      {notice && (
        <p className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 dark:border-primary/20 dark:bg-primary/8 dark:text-primary-accent">
          {notice}
        </p>
      )}

      {/* Add form */}
      {isFormOpen && (
        <Card className="animate-fade-in-up">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-text-primary">New Category</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Name
              </label>
              <input
                id="cat-name"
                type="text"
                required
                placeholder="e.g. Gym & Fitness"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-inset',
                  'border-gray-200 hover:border-gray-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                  'dark:border-white/8 dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70',
                )}
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">Type</span>
              <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/8">
                {(['expense', 'income'] as CategoryType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all duration-150',
                      type === t
                        ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary'
                        : 'text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-text-secondary',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Category
            </Button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </Card>
      )}

      {/* Expense categories */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-text-muted">
            Expense
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold text-gray-500 dark:bg-white/8 dark:text-text-muted">
            {expenseCategories.length}
          </span>
        </div>
        <CategoryGrid categories={expenseCategories} onDelete={(c) => void handleDelete(c)} />
      </section>

      {/* Income categories */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-text-muted">
            Income
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold text-gray-500 dark:bg-white/8 dark:text-text-muted">
            {incomeCategories.length}
          </span>
        </div>
        <CategoryGrid categories={incomeCategories} onDelete={(c) => void handleDelete(c)} />
      </section>
    </div>
  );
}
