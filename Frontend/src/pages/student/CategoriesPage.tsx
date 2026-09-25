import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/common';
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
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const { icon: Icon, badgeClassName } = iconFor(category);
        return (
          <div key={category.id} className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', badgeClassName)}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{category.name}</p>
                {category.isDefault && <p className="text-xs text-gray-400">Default</p>}
              </div>
            </div>
            {!category.isDefault && (
              <button type="button" onClick={() => onDelete(category)} className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label={`Delete ${category.name}`}>
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
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCategories() {
    if (!user) return;
    const cats = await categoryService.list(user.id).catch(() => [] as Category[]);
    setCategories(cats);
    setIsLoading(false);
  }

  useEffect(() => { void loadCategories(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  async function handleDelete(category: Category) {
    if (!user) return;
    const confirmed = window.confirm(`Delete "${category.name}"? Any transactions in this category will move to "${category.type === 'income' ? 'Other Income' : 'Others'}".`);
    if (!confirmed) return;
    const { reassignedCount } = await categoryService.remove(user.id, category.id);
    setNotice(reassignedCount > 0 ? `Deleted "${category.name}" — ${reassignedCount} transaction${reassignedCount === 1 ? '' : 's'} moved to the fallback category.` : `Deleted "${category.name}".`);
    void loadCategories();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !name.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await categoryService.create(user.id, { name: name.trim(), type });
      setName('');
      setIsFormOpen(false);
      setNotice(null);
      void loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Manage the categories used across your transactions.</p>
        </div>
        <Button variant="primary" onClick={() => { setIsFormOpen((o) => !o); setError(null); }}>
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'Add Category'}
        </Button>
      </div>

      {notice && <p className="text-sm text-brand-700">{notice}</p>}

      {isFormOpen && (
        <Card className="animate-fade-in-up p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="category-name" className="text-sm font-medium text-gray-700">Category name</label>
              <input id="category-name" type="text" required placeholder="e.g. Fitness" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Type</span>
              <div className="mt-1 inline-flex rounded-lg bg-gray-100 p-1">
                <button type="button" onClick={() => setType('expense')} className={cn('rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200', type === 'expense' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900')}>Expense</button>
                <button type="button" onClick={() => setType('income')} className={cn('rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200', type === 'income' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900')}>Income</button>
              </div>
            </div>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Save Category</Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Expense categories</h2>
            <CategoryGrid categories={expenseCategories} onDelete={(c) => void handleDelete(c)} />
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Income categories</h2>
            <CategoryGrid categories={incomeCategories} onDelete={(c) => void handleDelete(c)} />
          </div>
        </>
      )}
    </div>
  );
}
