import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Lightbulb,
  Moon,
  PiggyBank,
  Plus,
  Receipt,
  Sparkles,
  Sun,
  Sunrise,
  Target,
  TrendingUp,
  Wallet,
  Wand2,
} from 'lucide-react';
import { Card, EmptyState, PageSpinner } from '@/components/common';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { STUDENT_ROUTES, buildPath } from '@/constants/routes';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate, formatMonthLabel } from '@/utils/format';
import { budgetService, categoryService, getBudgetUtilization, transactionService } from '@/services';
import { reportsApi } from '@/api/reports.api';
import { insightsApi } from '@/api/insights.api';
import { notificationsApi } from '@/api/notifications.api';
import { cn } from '@/utils/cn';
import type { Transaction } from '@/types/transaction';
import type { BudgetSummary } from '@/types/budget';
import type { Category } from '@/types/category';
import type { AppNotification } from '@/types/notification';
import type { MonthlyReport } from '@/types/report';
import type { SavingTip, Insight } from '@/types/insight';

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

interface DashboardData {
  transactions: Transaction[];
  categories: Category[];
  budgetSummary: BudgetSummary | null;
  report: MonthlyReport | null;
  notifications: AppNotification[];
  tips: SavingTip[];
  insight: Insight | null;
}

// ── Helper: transaction type icon/color ────────────────────────────
function TxIcon({ type }: { type: 'income' | 'expense' }) {
  return (
    <span className={cn(
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
      type === 'income'
        ? 'bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent'
        : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-text-secondary',
    )}>
      {type === 'income'
        ? <ArrowUpRight className="h-4 w-4" />
        : <ArrowDownRight className="h-4 w-4" />}
    </span>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const month = monthKey();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 18 ? Sun : Moon;

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const [txResult, cats, budgetSum, report, notifs, tips, insights] = await Promise.allSettled([
        transactionService.list(user!.id),
        categoryService.list(user!.id),
        budgetService.summary(user!.id, month),
        reportsApi.getMonthlyReport({ month }),
        notificationsApi.list(),
        insightsApi.listSavingTips(),
        insightsApi.listInsights({ month }),
      ]);
      if (cancelled) return;
      setData({
        transactions: txResult.status === 'fulfilled' ? txResult.value : [],
        categories:   cats.status === 'fulfilled' ? cats.value : [],
        budgetSummary: budgetSum.status === 'fulfilled' ? budgetSum.value : null,
        report:        report.status === 'fulfilled' ? report.value : null,
        notifications: notifs.status === 'fulfilled' ? notifs.value : [],
        tips:          tips.status === 'fulfilled' ? tips.value : [],
        insight:       insights.status === 'fulfilled' ? (insights.value.find((i) => i.kind === 'monthly-summary') ?? null) : null,
      });
      setIsLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, month]);

  if (!user) return null;
  if (isLoading) return <PageSpinner />;

  const { transactions, categories, budgetSummary, report, notifications, tips, insight } = data!;
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const hasAnyTransactions = transactions.length > 0;
  const onboardingStatus = user.onboarding?.status ?? 'not_started';
  const setupIncomplete = onboardingStatus !== 'completed';
  const balance = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const topBudget = budgetSummary?.budgets.slice().sort((a, b) => getBudgetUtilization(b) - getBudgetUtilization(a))[0];
  const topBudgetCategoryName = topBudget ? catMap[topBudget.categoryId] ?? 'Category' : null;
  const topTip = tips[0];
  const categoryBreakdown = report?.categoryBreakdown ?? [];
  const totalExpenseThisMonth = report?.totalExpense ?? 0;

  // ── Empty state (no transactions yet) ─────────────────────────────
  if (!hasAnyTransactions) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-text-primary">
            <GreetingIcon className="h-6 w-6 text-amber-500" />
            {greeting}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Let&apos;s get your budget set up.</p>
        </div>

        <Card className="p-10">
          <EmptyState
            icon={setupIncomplete ? Wand2 : Wallet}
            title={setupIncomplete ? "Complete your setup" : "Add your first transaction"}
            description={
              setupIncomplete
                ? "Finish your money profile to unlock personalised budgeting insights and recommendations."
                : "Add your first income or expense and your dashboard will come alive with balance, spending breakdown, and saving tips."
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                {setupIncomplete && (
                  <Link to={`${STUDENT_ROUTES.onboarding}?edit=1`} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-btn-primary hover:shadow-btn-primary-hover">
                    <Wand2 className="h-4 w-4" /> Complete Setup
                  </Link>
                )}
                <Link to={`${STUDENT_ROUTES.newTransaction}?type=income`} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-btn-primary hover:shadow-btn-primary-hover">
                  <Plus className="h-4 w-4" /> Add Income
                </Link>
                <Link to={`${STUDENT_ROUTES.newTransaction}?type=expense`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-btn dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5">
                  <Plus className="h-4 w-4" /> Add Expense
                </Link>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // ── Full dashboard ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-text-primary">
            <GreetingIcon className="h-6 w-6 text-amber-500" />
            {greeting}, {firstName}!
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Here&apos;s your money overview for {formatMonthLabel(month)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`${STUDENT_ROUTES.newTransaction}?type=income`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-px dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
          >
            <Plus className="h-4 w-4" /> Add Income
          </Link>
          <Link
            to={`${STUDENT_ROUTES.newTransaction}?type=expense`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-btn-primary transition-all hover:bg-brand-700 hover:shadow-btn-primary-hover hover:-translate-y-px dark:bg-primary dark:hover:bg-primary-accent"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </Link>
        </div>
      </div>

      {/* Setup incomplete banner */}
      {setupIncomplete && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 dark:border-primary/20 dark:bg-primary/8">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-primary/20 dark:text-primary-accent">
            <Wand2 className="h-4 w-4" />
          </span>
          <p className="flex-1 text-sm font-medium text-gray-900 dark:text-text-primary">
            Complete your profile to unlock personalised insights and recommendations.
          </p>
          <Link to={`${STUDENT_ROUTES.onboarding}?edit=1`} className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-primary-accent">
            Complete Setup →
          </Link>
        </div>
      )}

      {/* Unread notifications banner */}
      {unreadNotifications.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/8">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="flex-1 text-sm font-medium text-gray-900 dark:text-text-primary">
            {unreadNotifications[0].title}
            {unreadNotifications.length > 1 && (
              <span className="ml-1 font-normal text-gray-500 dark:text-text-muted">
                (+{unreadNotifications.length - 1} more)
              </span>
            )}
          </p>
          <Link to={STUDENT_ROUTES.notifications} className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400">
            View <Bell className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={ArrowUpRight} label="Income"   value={formatCurrency(report?.totalIncome ?? 0, DEFAULT_CURRENCY)}       hint={formatMonthLabel(month)} tone="brand" />
        <StatCard icon={ArrowDownRight} label="Expenses" value={formatCurrency(totalExpenseThisMonth, DEFAULT_CURRENCY)}          hint={formatMonthLabel(month)} tone="red" />
        <StatCard icon={Wallet}         label="Balance"  value={formatCurrency(balance, DEFAULT_CURRENCY)}                        hint="All time"                tone="blue" />
        <StatCard icon={PiggyBank}      label="Saved"    value={formatCurrency(report?.netSavings ?? 0, DEFAULT_CURRENCY)}        hint={formatMonthLabel(month)} tone="amber" />
      </div>

      {/* Savings goal + budget overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Savings goal */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400">
                <Target className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Savings Goal</h2>
            </div>
            {!user.savingsGoalAmount && (
              <Link to={STUDENT_ROUTES.profile} className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent">
                Set goal →
              </Link>
            )}
          </div>
          {!user.savingsGoalAmount ? (
            <p className="mt-3 text-sm text-gray-400 dark:text-text-muted">No savings goal set yet.</p>
          ) : (
            <>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-text-primary">
                  {formatCurrency(Math.max(balance, 0), DEFAULT_CURRENCY)}
                  <span className="ml-1 text-sm font-normal text-gray-400 dark:text-text-muted">
                    / {formatCurrency(user.savingsGoalAmount, DEFAULT_CURRENCY)}
                  </span>
                </span>
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                  {Math.min(Math.round((Math.max(balance, 0) / user.savingsGoalAmount) * 100), 100)}%
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/8">
                <div
                  className="h-full rounded-full bg-teal-500 dark:bg-teal-400 transition-all duration-700"
                  style={{ width: `${Math.min((Math.max(balance, 0) / user.savingsGoalAmount) * 100, 100)}%` }}
                />
              </div>
            </>
          )}
        </Card>

        {/* Budget vs Actual */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Budget vs. Actual</h2>
            </div>
            {topBudgetCategoryName && (
              <span className="text-xs text-gray-400 dark:text-text-muted">{topBudgetCategoryName}</span>
            )}
          </div>
          {!topBudget || !budgetSummary ? (
            <div className="mt-3">
              <p className="text-sm text-gray-400 dark:text-text-muted">No budgets set for this month.</p>
              <Link to={STUDENT_ROUTES.budgets} className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent">
                Set a budget →
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-text-primary">
                  {formatCurrency(topBudget.spentAmount, DEFAULT_CURRENCY)}
                  <span className="ml-1 text-sm font-normal text-gray-400 dark:text-text-muted">
                    / {formatCurrency(topBudget.limitAmount, DEFAULT_CURRENCY)}
                  </span>
                </span>
                <span className={cn(
                  'text-sm font-bold',
                  getBudgetUtilization(topBudget) >= 100 ? 'text-red-600 dark:text-red-400'
                    : getBudgetUtilization(topBudget) >= 80 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-brand-600 dark:text-primary-accent',
                )}>
                  {getBudgetUtilization(topBudget)}%
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/8">
                <div
                  className={cn('h-full rounded-full transition-all duration-700',
                    getBudgetUtilization(topBudget) >= 100 ? 'bg-red-500'
                      : getBudgetUtilization(topBudget) >= 80 ? 'bg-amber-500'
                      : 'bg-brand-500 dark:bg-primary-accent',
                  )}
                  style={{ width: `${Math.min(getBudgetUtilization(topBudget), 100)}%` }}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Spending breakdown + sidebar cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Donut chart */}
        <Card className="lg:col-span-2">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Spending Breakdown</h2>
          <div className="mt-4">
            {categoryBreakdown.length === 0 ? (
              <EmptyState compact icon={Receipt} title="No expenses yet" description="Log an expense and this chart fills in automatically." />
            ) : (
              <CategoryDonutChart data={categoryBreakdown} total={totalExpenseThisMonth} totalLabel="Total Expenses" />
            )}
          </div>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Top category */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
                <Target className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Top Category</h2>
            </div>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-text-muted">No spending logged yet.</p>
            ) : (
              <>
                <p className="text-lg font-bold text-gray-900 dark:text-text-primary">{categoryBreakdown[0].categoryName}</p>
                <p className="text-sm text-gray-500 dark:text-text-secondary">
                  {formatCurrency(categoryBreakdown[0].amount, DEFAULT_CURRENCY)} · {categoryBreakdown[0].percentage}%
                </p>
              </>
            )}
          </Card>

          {/* Financial health */}
          <Card className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-2">Financial Health</h2>
            {report ? (
              <p className={cn(
                'text-sm font-medium',
                report.netSavings >= 0 ? 'text-brand-600 dark:text-primary-accent' : 'text-red-600 dark:text-red-400',
              )}>
                {report.netSavings >= 0
                  ? `+${formatCurrency(report.netSavings, DEFAULT_CURRENCY)} net positive`
                  : `${formatCurrency(Math.abs(report.netSavings), DEFAULT_CURRENCY)} overspent`}
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-text-muted">Log transactions to see your financial health.</p>
            )}
          </Card>
        </div>
      </div>

      {/* AI insight */}
      {insight && (
        <div className="flex items-start gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-400/15 dark:bg-blue-400/8">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{insight.title}</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-text-secondary">{insight.body}</p>
          </div>
        </div>
      )}

      {/* Saving tip */}
      {topTip && (
        <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-primary/15 dark:bg-primary/8 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 flex-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-primary/20 dark:text-primary-accent">
              <Lightbulb className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{topTip.title}</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-text-secondary">{topTip.body}</p>
            </div>
          </div>
          <Link to={STUDENT_ROUTES.savingTips} className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-primary-accent">
            View Tips →
          </Link>
        </div>
      )}

      {/* Recent transactions */}
      <Card noPadding>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Recent Transactions</h2>
          <Link to={STUDENT_ROUTES.transactions} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-primary-accent">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
          {transactions.slice(0, 6).map((txn) => {
            const categoryName = catMap[txn.categoryId] ?? 'Other';
            return (
              <Link
                key={txn.id}
                to={buildPath(STUDENT_ROUTES.transactionDetail, { id: txn.id })}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TxIcon type={txn.type} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-text-primary">
                      {txn.description || categoryName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-text-muted">
                      {txn.type === 'income' ? 'Income' : categoryName} · {formatDate(txn.occurredAt)}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'shrink-0 text-sm font-semibold tabular-nums',
                  txn.type === 'income'
                    ? 'text-brand-600 dark:text-primary-accent'
                    : 'text-gray-900 dark:text-text-primary',
                )}>
                  {txn.type === 'income' ? '+' : '−'}{formatCurrency(txn.amount, DEFAULT_CURRENCY)}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
