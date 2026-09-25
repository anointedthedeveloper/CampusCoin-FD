import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, FolderPlus, ListTree, Megaphone, Receipt, Sparkles, Users } from 'lucide-react';
import { Avatar, Card, EmptyState } from '@/components/common';
import { StatCard } from '@/components/dashboard/StatCard';
import { ADMIN_ROUTES, buildPath } from '@/constants/routes';
import { formatDate } from '@/utils/format';
import { adminStatisticsService, adminUserService } from '@/services';

const quickActions = [
  { label: 'Add Category', icon: FolderPlus, to: ADMIN_ROUTES.categories },
  { label: 'Send Announcement', icon: Megaphone, to: ADMIN_ROUTES.announcements },
  { label: 'View Statistics', icon: Sparkles, to: ADMIN_ROUTES.statistics },
];

export function AdminDashboardPage() {
  const statistics = useMemo(() => adminStatisticsService.getStatistics(), []);
  const recentUsers = useMemo(
    () => [...adminUserService.listUsers()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [],
  );

  const stats = [
    { label: 'Total Users', value: statistics.totalUsers.toLocaleString(), icon: Users, tone: 'brand' as const },
    { label: 'Total Transactions', value: statistics.totalTransactions.toLocaleString(), icon: Receipt, tone: 'blue' as const },
    { label: 'Categories in Use', value: statistics.totalCategories.toLocaleString(), icon: ListTree, tone: 'purple' as const },
    { label: 'Active Users (30d)', value: statistics.activeUsersLast30Days.toLocaleString(), icon: Activity, tone: 'amber' as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of the system.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900">Recent Users</h2>
          {recentUsers.length === 0 ? (
            <div className="mt-3">
              <EmptyState icon={Users} title="No students registered yet" description="New sign-ups will show up here." />
            </div>
          ) : (
            <div className="mt-3 divide-y divide-gray-100">
              {recentUsers.map((admin) => (
                <Link
                  key={admin.id}
                  to={buildPath(ADMIN_ROUTES.userDetail, { id: admin.id })}
                  className="flex items-center justify-between gap-3 py-3 transition-colors duration-200 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={admin.fullName} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{admin.fullName}</p>
                      <p className="text-xs text-gray-500">{admin.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(admin.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-3 space-y-2">
            {quickActions.map(({ label, icon: Icon, to }) => (
              <Link
                key={label}
                to={to}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
