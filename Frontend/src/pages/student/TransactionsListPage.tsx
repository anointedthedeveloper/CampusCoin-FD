import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Search, Trash2, Upload } from 'lucide-react';
import { Button, Card, EmptyState, Spinner } from '@/components/common';
import { STUDENT_ROUTES, buildPath } from '@/constants/routes';
import { categoryService, transactionService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Category } from '@/types/category';
import type { Transaction } from '@/types/transaction';
import type { CategoryType } from '@/types/category';

type TypeFilter = 'all' | CategoryType;

export function TransactionsListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categoryNameFor = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Other';

  async function load() {
    if (!user) return;
    setIsLoading(true);
    const [cats, txns] = await Promise.allSettled([
      categoryService.list(user.id),
      transactionService.list(user.id, {
        type: typeFilter === 'all' ? undefined : typeFilter,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        search: search.trim() || undefined,
      }),
    ]);
    setCategories(cats.status === 'fulfilled' ? cats.value : []);
    setTransactions(txns.status === 'fulfilled' ? txns.value : []);
    setIsLoading(false);
  }

  useEffect(() => { void load(); }, [user?.id, typeFilter, categoryFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    if (!user) return;
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    await transactionService.remove(user.id, id);
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Every income and expense you&apos;ve logged.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={STUDENT_ROUTES.import}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 dark:border-white/15 dark:text-text-secondary dark:hover:border-primary-accent/50 dark:hover:text-primary-accent"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Link>
          <Link to={STUDENT_ROUTES.newTransaction}>
            <Button variant="primary">Add Transaction</Button>
          </Link>
        </div>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-muted" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-border dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted dark:focus:border-primary-accent dark:focus:ring-primary-accent"
          />
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/10">
          {(['all', 'income', 'expense'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTypeFilter(option)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors duration-200',
                typeFilter === option
                  ? 'bg-brand-600 text-white shadow-sm dark:bg-primary'
                  : 'text-gray-600 hover:text-gray-900 dark:text-text-secondary dark:hover:text-text-primary',
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-border dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent dark:focus:ring-primary-accent"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : transactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Receipt}
              title={search || typeFilter !== 'all' || categoryFilter !== 'all' ? 'No transactions found' : 'No transactions yet'}
              description={
                search || typeFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Add your first income or expense to start building your history.'
              }
              action={
                !search && typeFilter === 'all' && categoryFilter === 'all' ? (
                  <Link to={STUDENT_ROUTES.newTransaction} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Add a transaction
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center gap-3 px-5 py-4">
                <Link
                  to={buildPath(STUDENT_ROUTES.transactionDetail, { id: txn.id })}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      txn.type === 'income'
                        ? 'bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent'
                        : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-text-secondary',
                    )}
                  >
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-text-primary">{txn.description || categoryNameFor(txn.categoryId)}</p>
                    <p className="text-xs text-gray-500 dark:text-text-muted">{txn.type === 'income' ? 'Income' : categoryNameFor(txn.categoryId)} · {formatDate(txn.occurredAt)}</p>
                  </div>
                </Link>
                <span className={cn('shrink-0 text-sm font-semibold', txn.type === 'income' ? 'text-brand-600 dark:text-primary-accent' : 'text-gray-900 dark:text-text-primary')}>
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount, DEFAULT_CURRENCY)}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(txn.id)}
                  className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
