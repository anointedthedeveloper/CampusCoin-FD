import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Receipt } from 'lucide-react';
import { Button, Card, EmptyState, PageSpinner } from '@/components/common';
import { STUDENT_ROUTES, buildPath } from '@/constants/routes';
import { categoryService, transactionService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { cn } from '@/utils/cn';
import { ApiError } from '@/types/api';
import type { Category, CategoryType } from '@/types/category';
import type { Transaction } from '@/types/transaction';
import { formatNumericInput, normalizeNumericInput } from '@/utils/number';
import { recordRecentTransaction } from '@/utils/recentTransactions';

export function TransactionEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [type, setType] = useState<CategoryType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the transaction once
  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    transactionService.getById(user.id, id).then((tx) => {
      if (cancelled) return;
      if (tx) {
        setTransaction(tx);
        setType(tx.type);
        setAmount(String(tx.amount));
        setCategoryId(tx.categoryId);
        setDescription(tx.description ?? '');
        setDate(tx.occurredAt.slice(0, 10));
      }
    }).finally(() => { if (!cancelled) setIsLoadingTx(false); });
    return () => { cancelled = true; };
  }, [user?.id, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch categories when type changes
  useEffect(() => {
    if (!user) return;
    categoryService.list(user.id, type).then(setCategories).catch(() => setCategories([]));
  }, [user?.id, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const showLoader = useMinLoadTime(isLoadingTx);
  if (showLoader) return <PageSpinner label="Loading transaction…" />;

  if (!user || !transaction) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState icon={Receipt} title="Transaction not found" description="This transaction may have been deleted." />
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !transaction) return;
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (!categoryId) { setError('Choose a category.'); return; }
    const selectedCategory = categories.find((category) => category.id === categoryId);
    if (/^(other|miscellaneous)$/i.test(selectedCategory?.name ?? '') && !description.trim()) {
      setError('Describe what this transaction was for.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await transactionService.update(user.id, transaction.id, {
        type, amount: parsedAmount, categoryId,
        description: description.trim() || undefined,
        occurredAt: new Date(date).toISOString(),
      });
      recordRecentTransaction(user.id, updated, 'edited');
      navigate(buildPath(STUDENT_ROUTES.transactionDetail, { id: transaction.id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save these changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-text-secondary dark:hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />Edit Transaction
      </button>

      <Card className="p-6">
        <div className="mb-6 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/10">
          <button type="button" onClick={() => { setType('income'); setCategoryId(''); }} className={cn('rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200', type === 'income' ? 'bg-brand-600 text-white shadow-sm dark:bg-primary' : 'text-gray-600 hover:text-gray-900 dark:text-text-secondary dark:hover:text-text-primary')}>Income</button>
          <button type="button" onClick={() => { setType('expense'); setCategoryId(''); }} className={cn('rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200', type === 'expense' ? 'bg-brand-600 text-white shadow-sm dark:bg-primary' : 'text-gray-600 hover:text-gray-900 dark:text-text-secondary dark:hover:text-text-primary')}>Expense</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Amount</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400 dark:text-text-muted">{user.settings?.currency ?? 'NGN'}</span>
              <input id="amount" type="text" inputMode="decimal" required value={formatNumericInput(amount)} onChange={(e) => setAmount(normalizeNumericInput(e.target.value))} className="w-full rounded-lg border border-gray-300 py-2 pl-12 pr-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-border dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent dark:focus:ring-primary-accent" />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Category</label>
            <select id="category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-border dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent dark:focus:ring-primary-accent">
              <option value="" disabled>Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Description <span className="text-gray-400 dark:text-text-muted">{/^(other|miscellaneous)$/i.test(categories.find((category) => category.id === categoryId)?.name ?? '') ? '(required for this category)' : '(optional)'}</span></label>
            <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-border dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent dark:focus:ring-primary-accent" />
          </div>

          <div>
            <label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Date</label>
            <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-border dark:bg-surface dark:text-text-primary dark:[color-scheme:dark] dark:focus:border-primary-accent dark:focus:ring-primary-accent" />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>Save Changes</Button>
        </form>
      </Card>
    </div>
  );
}
