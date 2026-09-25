import { useMemo } from 'react';
import { Activity, ListTree, Receipt, Users } from 'lucide-react';
import { Card, EmptyState } from '@/components/common';
import { StatCard } from '@/components/dashboard/StatCard';
import { adminStatisticsService, adminUserService } from '@/services';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate } from '@/utils/format';

export function AdminStatisticsPage() {
  const statistics = useMemo(() => adminStatisticsService.getStatistics(), []);
  const topUsers = useMemo(
    () => [...adminUserService.listUsers()].sort((a, b) => b.transactionCount - a.transactionCount).slice(0, 10),
    [],
  );
  const maxTransactions = Math.max(...topUsers.map((u) => u.transactionCount), 1);

  const stats = [
    { label: 'Total Users', value: statistics.totalUsers.toLocaleString(), icon: Users, tone: 'brand' as const },
    { label: 'Active Users (30d)', value: statistics.activeUsersLast30Days.toLocaleString(), icon: Activity, tone: 'blue' as const },
    { label: 'Total Transactions', value: statistics.totalTransactions.toLocaleString(), icon: Receipt, tone: 'purple' as const },
    { label: 'Categories in Use', value: statistics.totalCategories.toLocaleString(), icon: ListTree, tone: 'amber' as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
        <p className="mt-1 text-sm text-gray-500">Platform-wide activity at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Average Monthly Spend per Active User</h2>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(statistics.averageMonthlySpendPerUser, DEFAULT_CURRENCY)}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Across students with at least one expense this calendar month.</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">Users by Transaction Activity</h2>
        {topUsers.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={Users} title="No student activity yet" description="This fills in once students start logging transactions." />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {topUsers.map((user) => (
              <div key={user.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{user.fullName}</span>
                  <span className="text-gray-500">{user.transactionCount} transactions</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(user.transactionCount / maxTransactions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-gray-400">Generated {formatDate(statistics.generatedAt)}</p>
    </div>
  );
}
