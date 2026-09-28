import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Clock, Receipt, Repeat, Search, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { Button, Card, ConfirmDialog, EmptyState, PageSpinner } from '@/components/common';
import { forgetRecentTransaction, getRecentTransactions, type RecentTransactionEntry } from '@/utils/recentTransactions';
import { STUDENT_ROUTES, buildPath } from '@/constants/routes';
import { categoryService, transactionService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
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
  const showLoader = useMinLoadTime(isLoading);
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [page, setPage]                   = useState(1);
  const [totalItems, setTotalItems]       = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [recent, setRecent]               = useState<RecentTransactionEntry[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) setRecent(getRecentTransactions(user.id));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryNameFor = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Other';

  const PAGE_SIZE = 50;

  function currentFilters(pageNumber: number) {
    return {
      type:       typeFilter === 'all' ? undefined : typeFilter,
      categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
      search:     search.trim() || undefined,
      startDate:  startDate || undefined,
      endDate:    endDate || undefined,
      page:       pageNumber,
      pageSize:   PAGE_SIZE,
    };
  }

  async function load() {
    if (!user) return;
    setIsLoading(true);
    const [cats, txns] = await Promise.allSettled([
      categoryService.list(user.id),
      transactionService.listPaginated(user.id, currentFilters(1)),
    ]);
    setCategories(cats.status === 'fulfilled' ? cats.value : []);
    setTransactions(txns.status === 'fulfilled' ? txns.value?.items ?? [] : []);
    setTotalItems(txns.status === 'fulfilled' ? txns.value?.totalItems ?? 0 : 0);
    setPage(1);
    setIsLoading(false);
  }

  async function loadMore() {
    if (!user) return;
    setIsLoadingMore(true);
    try {
      const next = await transactionService.listPaginated(user.id, currentFilters(page + 1));
      setTransactions((prev) => [...prev, ...(next?.items ?? [])]);
      setPage((p) => p + 1);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [user?.id, typeFilter, categoryFilter, search, startDate, endDate]);

  async function handleDelete(id: string) {
    if (!user) return;
    await transactionService.remove(user.id, id);
    forgetRecentTransaction(user.id, id);
    setRecent(getRecentTransactions(user.id));
    void load();
  }

  const isFiltered = search || typeFilter !== 'all' || categoryFilter !== 'all' || startDate || endDate;
  const currency = user?.settings?.currency ?? DEFAULT_CURRENCY;

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
                'dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted',
                'dark:hover:border-white/15 dark:focus:border-primary-accent/70 dark:focus:ring-primary-accent/20',
              )}
            />
          </div>

          {/* Type toggle */}
          <div className="inline-flex shrink-0 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.08]">
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
                'dark:border-white/[0.08] dark:bg-surface dark:text-text-primary',
                'dark:hover:border-white/15 dark:focus:border-primary-accent/70',
              )}
            >
              <option value="all">All categories</option>
              {categories
                .filter((c) => typeFilter === 'all' || c.type === typeFilter)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
        </div>
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 px-4 py-3 text-sm dark:border-white/[0.04]">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted">Date</span>
          <input
            type="date"
            aria-label="From date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:[color-scheme:dark]"
          />
          <span className="text-gray-400 dark:text-text-muted">to</span>
          <input
            type="date"
            aria-label="To date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:[color-scheme:dark]"
          />
          {isFiltered && (
            <button
              type="button"
              onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); setStartDate(''); setEndDate(''); }}
              className="ml-auto text-xs font-semibold text-brand-700 hover:underline dark:text-primary-accent"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {pendingDelete && (
        <ConfirmDialog
          open
          title="Delete this transaction?"
          description="It will be removed from your history, budgets and reports. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}

      {/* Recently viewed / edited (kept across sessions) */}
      {recent.length > 0 && !isFiltered && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted">
            <Clock className="h-3.5 w-3.5" /> Recently viewed &amp; edited
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recent.map((entry) => (
              <Link
                key={entry.id}
                to={buildPath(STUDENT_ROUTES.transactionDetail, { id: entry.id })}
                className="min-w-[11rem] shrink-0 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 transition-colors hover:border-brand-200 dark:border-white/5 dark:bg-surface-elevated dark:hover:border-primary/30"
              >
                <p className="truncate text-sm font-medium text-gray-900 dark:text-text-primary">{entry.description || (entry.type === 'income' ? 'Income' : 'Expense')}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-text-muted">
                  {entry.type === 'income' ? '+' : '−'}{formatCurrency(entry.amount, currency)} · {entry.kind === 'edited' ? 'edited' : 'viewed'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Transactions list */}
      <Card noPadding>
        {showLoader ? (
          <div className="flex justify-center py-16"><PageSpinner label="Loading transactions…" /></div>
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
                        : 'bg-gray-100 text-gray-500 dark:bg-white/[0.08] dark:text-text-secondary',
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
                        {categoryName} · {formatDate(txn.occurredAt)}
                        {String(txn.source) === 'recurring' && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-px text-[10px] font-semibold text-gray-500 dark:bg-white/[0.06] dark:text-text-muted">
                            <Repeat className="h-2.5 w-2.5" /> recurring
                          </span>
                        )}
                      </p>
                    </Link>

                    {/* Amount */}
                    <span className={cn(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      txn.type === 'income'
                        ? 'text-brand-600 dark:text-primary-accent'
                        : 'text-gray-900 dark:text-text-primary',
                    )}>
                      {txn.type === 'income' ? '+' : '−'}{formatCurrency(txn.amount, currency)}
                    </span>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setPendingDelete(txn.id)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-all sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400"
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400 dark:text-text-muted">
                  Showing {transactions.length} of {totalItems} transaction{totalItems !== 1 ? 's' : ''}
                </p>
                {transactions.length < totalItems && (
                  <Button variant="secondary" size="sm" onClick={() => void loadMore()} isLoading={isLoadingMore}>
                    Load more
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
