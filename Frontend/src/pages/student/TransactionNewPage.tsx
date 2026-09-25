import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Plus } from 'lucide-react';
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

export function TransactionNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'expense' ? 'expense' : 'income';

  const [type, setType] = useState<CategoryType>(initialType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    categoryService.list(user.id, type).then(setCategories).catch(() => setCategories([]));
  }, [user?.id, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const quickCategories = type === 'income' ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;

  function handleTypeChange(nextType: CategoryType) {
    setType(nextType);
    setCategoryId('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (!categoryId) { setError('Choose a category.'); return; }

    setIsSubmitting(true);
    try {
      await transactionService.create(user.id, {
        type, amount: parsedAmount, categoryId,
        description: description.trim() || undefined,
        occurredAt: new Date(date).toISOString(),
      });
      navigate(STUDENT_ROUTES.dashboard);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Add {type === 'income' ? 'Income' : 'Expense'}
      </button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-6 md:col-span-2">
          <div className="mb-6 inline-flex rounded-lg bg-gray-100 p-1">
            <button type="button" onClick={() => handleTypeChange('income')} className={cn('rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200', type === 'income' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900')}>Income</button>
            <button type="button" onClick={() => handleTypeChange('expense')} className={cn('rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200', type === 'expense' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900')}>Expense</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="text-sm font-medium text-gray-700">Amount</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400">₦</span>
                <input id="amount" type="number" min="0" step="0.01" required placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="text-sm font-medium text-gray-700">Category</label>
              <select id="category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="" disabled>Select a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="text-sm font-medium text-gray-700">Description <span className="text-gray-400">(optional)</span></label>
              <input id="description" type="text" placeholder={type === 'income' ? 'e.g. Monthly allowance from parents' : 'e.g. Campus Cafe'} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>

            <div>
              <label htmlFor="date" className="text-sm font-medium text-gray-700">Date</label>
              <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>Save {type === 'income' ? 'Income' : 'Expense'}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-900">Quick Categories</h2>
          <div className="mt-3 space-y-2">
            {categories.map((c) => {
              const quick = quickCategories[c.name];
              const Icon = quick?.icon ?? MoreHorizontal;
              return (
                <button key={c.id} type="button" onClick={() => setCategoryId(c.id)} className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm', categoryId === c.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-700 hover:border-gray-300')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', quick?.badgeClassName ?? 'bg-gray-100 text-gray-600')}><Icon className="h-4 w-4" /></span>
                  {c.name}
                </button>
              );
            })}
            <Link to={STUDENT_ROUTES.categories} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors duration-200 hover:border-brand-400 hover:text-brand-600">
              <Plus className="h-4 w-4" />Add Custom Category
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
