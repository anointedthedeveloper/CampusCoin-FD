import { useEffect, useState } from 'react';
import { Activity, ListTree, Receipt, Users } from 'lucide-react';
import { Card, EmptyState, PageSpinner } from '@/components/common';
import { StatCard } from '@/components/dashboard/StatCard';
import { adminStatisticsService, adminUserService } from '@/services';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate } from '@/utils/format';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import type { SystemStatistics, AdminUserSummary } from '@/types/admin';

export function AdminStatisticsPage() {
  const [statistics, setStatistics] = useState<SystemStatistics | null>(null);
  const [topUsers, setTopUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const showLoader = useMinLoadTime(isLoading);

  useEffect(() => {
    async function load() {
      const [statsResult, usersResult] = await Promise.allSettled([
        adminStatisticsService.getStatistics(),
        adminUserService.listUsers(),
      ]);
      const users = usersResult.status === 'fulfilled' ? usersResult.value ?? [] : [];
      if (statsResult.status === 'fulfilled') setStatistics(statsResult.value);
      setTopUsers([...users].sort((a, b) => b.transactionCount - a.transactionCount).slice(0, 10));
      setIsLoading(false);
    }
    void load();
  }, []);

  if (showLoader) return <PageSpinner label="Loading statistics…" />;
  if (!statistics) {
    return (
      <EmptyState
        title="Statistics unavailable"
        description="System statistics could not be loaded right now. Refresh the page to try again."
      />
    );
  }

  const maxTransactions = Math.max(...topUsers.map((u) => u.transactionCount), 1);
  const categories = statistics.mostUsedCategories ?? [];
  const maxCategoryCount = Math.max(...categories.map((c) => c.transactionCount), 1);

  const stats = [
    { label: 'Total Users', value: statistics.totalUsers.toLocaleString(), icon: Users, tone: 'brand' as const },
    { label: 'Active Users (30d)', value: statistics.activeUsersLast30Days.toLocaleString(), icon: Activity, tone: 'blue' as const },
    { label: 'Total Transactions', value: statistics.totalTransactions.toLocaleString(), icon: Receipt, tone: 'purple' as const },
    { label: 'Default Categories', value: statistics.totalCategories.toLocaleString(), icon: ListTree, tone: 'amber' as const },
  ];

  const miniStats = [
    { label: 'New users (30d)', value: statistics.newUsersLast30Days ?? 0 },
    { label: 'Suspended users', value: statistics.suspendedUsers ?? 0 },
    { label: 'Income entries', value: statistics.incomeTransactions ?? 0 },
    { label: 'Expense entries', value: statistics.expenseTransactions ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Statistics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Platform-wide activity at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {miniStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-white/5 dark:bg-surface-elevated">
            <p className="text-xs text-gray-500 dark:text-text-muted">{stat.label}</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-text-primary">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Most-used Categories</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-text-muted">By number of transactions across all students.</p>
          {categories.length === 0 ? (
            <div className="mt-4">
              <EmptyState compact icon={ListTree} title="No category usage yet" description="This fills in once students log transactions." />
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {categories.map((category) => (
                <div key={`${category.type}-${category.name}`}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-gray-900 dark:text-text-primary">
                      <span className="truncate">{category.name}</span>
                      <span className={category.type === 'income'
                        ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
                        : 'rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700 dark:bg-rose-400/10 dark:text-rose-300'}>
                        {category.type}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-500 dark:text-text-muted">
                      {category.transactionCount} · {formatCurrency(category.totalAmount, DEFAULT_CURRENCY)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <div
                      className={category.type === 'income' ? 'h-full rounded-full bg-emerald-500' : 'h-full rounded-full bg-brand-600 dark:bg-primary'}
                      style={{ width: `${(category.transactionCount / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Most Active Users</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-text-muted">Students with the most logged transactions.</p>
          {topUsers.length === 0 || topUsers.every((u) => u.transactionCount === 0) ? (
            <div className="mt-4">
              <EmptyState compact icon={Users} title="No student activity yet" description="This fills in once students start logging transactions." />
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {topUsers.filter((u) => u.transactionCount > 0).map((user) => (
                <div key={user.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-gray-900 dark:text-text-primary">{user.fullName}</span>
                    <span className="shrink-0 text-xs text-gray-500 dark:text-text-muted">{user.transactionCount} transactions</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <div className="h-full rounded-full bg-brand-500 dark:bg-primary-accent" style={{ width: `${(user.transactionCount / maxTransactions) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Average Monthly Spend per Active User</h2>
          <span className="text-lg font-bold text-gray-900 dark:text-text-primary">
            {formatCurrency(statistics.averageMonthlySpendPerUser, DEFAULT_CURRENCY)}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Average of each student&apos;s total expenses per month they were active.</p>
      </Card>

      <p className="text-center text-xs text-gray-400 dark:text-text-muted">Generated {formatDate(statistics.generatedAt)}</p>
    </div>
  );
}
