import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Flag,
  Gauge,
  Lightbulb,
  Moon,
  PiggyBank,
  Plus,
  Receipt,
  Sparkles,
  Sun,
  Sunrise,
  Target,
  Wallet,
} from 'lucide-react';
import { Card, EmptyState, Spinner } from '@/components/common';
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
        categories: cats.status === 'fulfilled' ? cats.value : [],
        budgetSummary: budgetSum.status === 'fulfilled' ? budgetSum.value : null,
        report: report.status === 'fulfilled' ? report.value : null,
        notifications: notifs.status === 'fulfilled' ? notifs.value : [],
        tips: tips.status === 'fulfilled' ? tips.value : [],
        insight: insights.status === 'fulfilled' ? (insights.value.find((i) => i.kind === 'monthly-summary') ?? null) : null,
      });
      setIsLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, month]);

  if (!user) return null;
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { transactions, categories, budgetSummary, report, notifications, tips, insight } = data!;
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const hasAnyTransactions = transactions.length > 0;

  const balance = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const topBudget = budgetSummary?.budgets.slice().sort((a, b) => getBudgetUtilization(b) - getBudgetUtilization(a))[0];
  const topBudgetCategoryName = topBudget ? catMap[topBudget.categoryId] ?? 'Category' : null;
  const topTip = tips[0];
  const categoryBreakdown = report?.categoryBreakdown ?? [];
  const totalExpenseThisMonth = report?.totalExpense ?? 0;

  if (!hasAnyTransactions) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <GreetingIcon className="h-6 w-6 text-amber-500" />
            {greeting}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">Let&apos;s get your budget set up.</p>
        </div>
        <Card className="p-10">
          <EmptyState
            icon={Wallet}
            title="No transactions yet"
            description="Add your first income or expense to see your balance, spending breakdown, and saving tips come to life here."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to={`${STUDENT_ROUTES.newTransaction}?type=income`}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Add Income
                </Link>
                <Link
                  to={`${STUDENT_ROUTES.newTransaction}?type=expense`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Link>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <GreetingIcon className="h-6 w-6 text-amber-500" />
            {greeting}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">Here&apos;s your money overview for {formatMonthLabel(month)}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`${STUDENT_ROUTES.newTransaction}?type=income`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Income
          </Link>
          <Link
            to={`${STUDENT_ROUTES.newTransaction}?type=expense`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Link>
        </div>
      </div>

      {unreadNotifications.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="flex-1 text-sm font-medium text-gray-900">
            {unreadNotifications[0].title}
            {unreadNotifications.length > 1 && (
              <span className="ml-1 font-normal text-gray-500">
                (+{unreadNotifications.length - 1} more alert{unreadNotifications.length - 1 === 1 ? '' : 's'})
              </span>
            )}
          </p>
          <Link to={STUDENT_ROUTES.notifications} className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-800">
            View <Bell className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ArrowUpRight}
          label="Track Income"
          value={formatCurrency(report?.totalIncome ?? 0, DEFAULT_CURRENCY)}
          hint="This month"
          tone="brand"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Total Expenses"
          value={formatCurrency(totalExpenseThisMonth, DEFAULT_CURRENCY)}
          hint="This month"
          tone="blue"
        />
        <StatCard
          icon={Wallet}
          label="Balance"
          value={formatCurrency(balance, DEFAULT_CURRENCY)}
          hint="All time"
          tone="red"
        />
        <StatCard
          icon={PiggyBank}
          label="Savings"
          value={formatCurrency(report?.netSavings ?? 0, DEFAULT_CURRENCY)}
          hint="This month"
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-gray-500">
            <Gauge className="h-4 w-4" />
            <h2 className="text-sm font-semibold text-gray-900">Financial Health Snapshot</h2>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {report
              ? report.netSavings >= 0
                ? `You're net positive by ${formatCurrency(report.netSavings, DEFAULT_CURRENCY)} this month. Keep it up.`
                : `Spending is ${formatCurrency(Math.abs(report.netSavings), DEFAULT_CURRENCY)} over income this month.`
              : 'Log transactions to see your financial health.'}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-gray-500">
            <Flag className="h-4 w-4" />
            <h2 className="text-sm font-semibold text-gray-900">Savings Goal Progress</h2>
          </div>
          {!user.savingsGoalAmount ? (
            <div className="mt-2">
              <p className="text-sm text-gray-500">You haven&apos;t set a savings goal yet.</p>
              <Link to={STUDENT_ROUTES.profile} className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
                Set a goal in your profile →
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(Math.max(balance, 0), DEFAULT_CURRENCY)}
                  <span className="text-sm font-normal text-gray-400"> / {formatCurrency(user.savingsGoalAmount, DEFAULT_CURRENCY)}</span>
                </p>
                <span className="text-sm font-semibold text-brand-600">
                  {Math.min(Math.round((Math.max(balance, 0) / user.savingsGoalAmount) * 100), 100)}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${Math.min((Math.max(balance, 0) / user.savingsGoalAmount) * 100, 100)}%` }}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900">Spending Breakdown</h2>
          <div className="mt-4">
            {categoryBreakdown.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses yet this month"
                description="Log an expense and this chart will fill in automatically."
              />
            ) : (
              <CategoryDonutChart data={categoryBreakdown} total={totalExpenseThisMonth} totalLabel="Total Expenses" />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <Target className="h-4 w-4" />
              <h2 className="text-sm font-semibold text-gray-900">Top Category</h2>
            </div>
            {categoryBreakdown.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No spending logged this month yet.</p>
            ) : (
              <>
                <p className="mt-3 text-lg font-bold text-gray-900">{categoryBreakdown[0].categoryName}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(categoryBreakdown[0].amount, DEFAULT_CURRENCY)} · {categoryBreakdown[0].percentage}% of total expenses
                </p>
              </>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-900">Budget vs. Actual</h2>
            {!topBudget || !budgetSummary ? (
              <div className="mt-2">
                <p className="text-sm text-gray-500">No budgets set for this month yet.</p>
                <Link to={STUDENT_ROUTES.budgets} className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Set a budget →
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-gray-500">{topBudgetCategoryName}</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(topBudget.spentAmount, DEFAULT_CURRENCY)}
                    <span className="text-sm font-normal text-gray-400"> / {formatCurrency(topBudget.limitAmount, DEFAULT_CURRENCY)}</span>
                  </p>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      getBudgetUtilization(topBudget) >= 100
                        ? 'text-red-600'
                        : getBudgetUtilization(topBudget) >= 80
                          ? 'text-amber-600'
                          : 'text-brand-600',
                    )}
                  >
                    {getBudgetUtilization(topBudget)}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      getBudgetUtilization(topBudget) >= 100
                        ? 'bg-red-500'
                        : getBudgetUtilization(topBudget) >= 80
                          ? 'bg-amber-500'
                          : 'bg-brand-500',
                    )}
                    style={{ width: `${Math.min(getBudgetUtilization(topBudget), 100)}%` }}
                  />
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {insight && (
        <Card className="flex items-start gap-3 border-blue-200 bg-blue-50 p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
            <p className="mt-1 text-sm text-gray-600">{insight.body}</p>
          </div>
        </Card>
      )}

      {topTip && (
        <Card className="flex flex-col gap-4 border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Lightbulb className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{topTip.title}</p>
              <p className="text-sm text-gray-600">{topTip.body}</p>
            </div>
          </div>
          <Link to={STUDENT_ROUTES.savingTips} className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800">
            View Details →
          </Link>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
          <Link to={STUDENT_ROUTES.transactions} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        <div className="mt-3 divide-y divide-gray-100">
          {transactions.slice(0, 5).map((txn) => {
            const categoryName = catMap[txn.categoryId] ?? 'Other';
            return (
              <Link
                key={txn.id}
                to={buildPath(STUDENT_ROUTES.transactionDetail, { id: txn.id })}
                className="flex items-center justify-between gap-3 py-3 transition-colors duration-150 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      txn.type === 'income' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{txn.description || categoryName}</p>
                    <p className="text-xs text-gray-500">
                      {txn.type === 'income' ? 'Income' : categoryName} · {formatDate(txn.occurredAt)}
                    </p>
                  </div>
                </div>
                <span className={cn('text-sm font-semibold', txn.type === 'income' ? 'text-brand-600' : 'text-gray-900')}>
                  {txn.type === 'income' ? '+' : '-'}
                  {formatCurrency(txn.amount, DEFAULT_CURRENCY)}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
