import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Card } from '@/components/common';
import {
  DEFAULT_CATEGORY_ICON,
  EXPENSE_CATEGORY_ICONS,
  INCOME_CATEGORY_ICONS,
} from '@/constants/categoryIcons';
import { adminCategoryService } from '@/services';
import { FALLBACK_CATEGORY_NAMES, type DefaultCategoryTemplate } from '@/services/admin/category.service';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { CategoryType } from '@/types/category';

function iconFor(template: DefaultCategoryTemplate) {
  const map = template.type === 'income' ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;
  return map[template.name] ?? DEFAULT_CATEGORY_ICON;
}

function CategoryGrid({
  templates,
  onDelete,
}: {
  templates: DefaultCategoryTemplate[];
  onDelete: (template: DefaultCategoryTemplate) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const { icon: Icon, badgeClassName } = iconFor(template);
        const isProtected = FALLBACK_CATEGORY_NAMES.includes(template.name);
        return (
          <div
            key={template.id}
            className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', badgeClassName)}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="truncate text-sm font-medium text-gray-900">{template.name}</p>
            </div>
            {!isProtected && (
              <button
                type="button"
                onClick={() => onDelete(template)}
                className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                aria-label={`Delete ${template.name}`}
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

export function AdminCategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allTemplates, setAllTemplates] = useState<DefaultCategoryTemplate[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    void adminCategoryService.list().then(setAllTemplates);
  }, [refreshToken]);

  const expenseTemplates = allTemplates.filter((t) => t.type === 'expense');
  const incomeTemplates = allTemplates.filter((t) => t.type === 'income');

  function handleDelete(template: DefaultCategoryTemplate) {
    const confirmed = window.confirm(
      `Remove "${template.name}" from the default categories? Existing students keep their own copy — this only changes what new sign-ups start with.`,
    );
    if (!confirmed) return;
    try {
      adminCategoryService.remove(template.id);
      setRefreshToken((token) => token + 1);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not remove this category.');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);

    setIsSubmitting(true);
    try {
      adminCategoryService.create({ name: name.trim(), type });
      setName('');
      setIsFormOpen(false);
      setRefreshToken((token) => token + 1);
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
          <p className="mt-1 text-sm text-gray-500">
            Manage the default categories every new student starts with.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setIsFormOpen((open) => !open);
            setError(null);
          }}
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'Add Category'}
        </Button>
      </div>

      {isFormOpen && (
        <Card className="animate-fade-in-up p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="category-name" className="text-sm font-medium text-gray-700">
                Category name
              </label>
              <input
                id="category-name"
                type="text"
                required
                placeholder="e.g. Health & Wellness"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Type</span>
              <div className="mt-1 inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
                    type === 'expense' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
                    type === 'income' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  Income
                </button>
              </div>
            </div>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Category
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Expense categories</h2>
        <CategoryGrid templates={expenseTemplates} onDelete={handleDelete} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Income categories</h2>
        <CategoryGrid templates={incomeTemplates} onDelete={handleDelete} />
      </div>
    </div>
  );
}
