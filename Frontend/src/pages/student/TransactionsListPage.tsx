import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Receipt, Search, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { Button, Card, EmptyState, PageSpinner } from '@/components/common';
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

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'income',  label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

export function TransactionsListPage() {
  const { user } = useAuth();
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories]       = useState<Category[]>([]);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [isLoading, setIsLoading]         = useState(true);

  const categoryNameFor = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Other';

  async function load() {
    if (!user) return;
    setIsLoading(true);
    const [cats, txns] = await Promise.allSettled([
      categoryService.list(user.id),
      transactionService.list(user.id, {
        type:       typeFilter === 'all' ? undefined : typeFilter,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        search:     search.trim() || undefined,
      }),
    ]);
    setCategories(cats.status === 'fulfilled' ? cats.value : []);
    setTransactions(txns.status === 'fulfilled' ? txns.value : []);
    setIsLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [user?.id, typeFilter, categoryFilter, search]);

  async function handleDelete(id: string) {
    if (!user) return;
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    await transactionService.remove(user.id, id);
    void load();
  }

  const isFiltered = search || typeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Transactions</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Every income and expense you&apos;ve logged.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={STUDENT_ROUTES.import}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-px dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </Link>
          <Link to={STUDENT_ROUTES.newTransaction}>
            <Button variant="primary" size="md">
              Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <Card noPadding className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-muted" />
            <input
              type="text"
              placeholder="Search description or merchant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-gray-900',
                'border-gray-200 hover:border-gray-300',
                'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                'dark:border-white/8 dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted',
                'dark:hover:border-white/15 dark:focus:border-primary-accent/70 dark:focus:ring-primary-accent/20',
              )}
            />
          </div>

          {/* Type toggle */}
          <div className="inline-flex shrink-0 rounded-lg bg-gray-100 p-1 dark:bg-white/8">
            {TYPE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                  typeFilter === value
                    ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-text-secondary',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="relative shrink-0">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-text-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={cn(
                'rounded-lg border bg-white py-2 pl-8 pr-8 text-sm text-gray-900 appearance-none',
                'border-gray-200 hover:border-gray-300',
                'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                'dark:border-white/8 dark:bg-surface dark:text-text-primary',
                'dark:hover:border-white/15 dark:focus:border-primary-accent/70',
              )}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions list */}
      <Card noPadding>
        {isLoading ? (
          <div className="flex justify-center py-16"><PageSpinner /></div>
        ) : transactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Receipt}
              title={isFiltered ? 'No transactions found' : 'No transactions yet'}
              description={
                isFiltered
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first income or expense to start building your history.'
              }
              action={
                !isFiltered ? (
                  <Link to={STUDENT_ROUTES.newTransaction}>
                    <Button variant="primary" size="sm">Add a transaction</Button>
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Column headers — desktop only */}
            <div className="hidden border-b border-gray-50 px-5 py-2.5 dark:border-white/[0.04] sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted">Transaction</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted">Date</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-right text-gray-400 dark:text-text-muted">Amount</span>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
              {transactions.map((txn) => {
                const categoryName = categoryNameFor(txn.categoryId);
                return (
                  <div
                    key={txn.id}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                  >
                    {/* Icon */}
                    <span className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      txn.type === 'income'
                        ? 'bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent'
                        : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-text-secondary',
                    )}>
                      {txn.type === 'income'
                        ? <ArrowUpRight className="h-4 w-4" />
                        : <ArrowDownRight className="h-4 w-4" />}
                    </span>

                    {/* Description + meta */}
                    <Link
                      to={buildPath(STUDENT_ROUTES.transactionDetail, { id: txn.id })}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-text-primary">
                        {txn.description || categoryName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-text-muted">
                        {txn.type === 'income' ? 'Income' : categoryName} · {formatDate(txn.occurredAt)}
                      </p>
                    </Link>

                    {/* Amount */}
                    <span className={cn(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      txn.type === 'income'
                        ? 'text-brand-600 dark:text-primary-accent'
                        : 'text-gray-900 dark:text-text-primary',
                    )}>
                      {txn.type === 'income' ? '+' : '−'}{formatCurrency(txn.amount, DEFAULT_CURRENCY)}
                    </span>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => void handleDelete(txn.id)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer count */}
            <div className="border-t border-gray-50 px-5 py-3 dark:border-white/[0.04]">
              <p className="text-xs text-gray-400 dark:text-text-muted">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
