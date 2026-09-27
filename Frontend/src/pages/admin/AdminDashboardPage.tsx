import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, FolderPlus, ListTree, Megaphone, Receipt, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, PageSpinner } from '@/components/common';
import { StatCard } from '@/components/dashboard/StatCard';
import { ADMIN_ROUTES, buildPath } from '@/constants/routes';
import { formatDate } from '@/utils/format';
import { adminStatisticsService, adminUserService } from '@/services';
import type { SystemStatistics, AdminUserSummary } from '@/types/admin';

const quickActions = [
  { label: 'Add Category',       icon: FolderPlus, to: ADMIN_ROUTES.categories,    desc: 'Create a new system default' },
  { label: 'Send Announcement',  icon: Megaphone,  to: ADMIN_ROUTES.announcements, desc: 'Broadcast to all students' },
  { label: 'View Statistics',    icon: Sparkles,   to: ADMIN_ROUTES.statistics,    desc: 'Detailed usage analytics' },
];

export function AdminDashboardPage() {
  const [statistics,   setStatistics]   = useState<SystemStatistics | null>(null);
  const [recentUsers,  setRecentUsers]  = useState<AdminUserSummary[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      const [stats, users] = await Promise.all([
        adminStatisticsService.getStatistics(),
        adminUserService.listUsers(),
      ]);
      setStatistics(stats);
      setRecentUsers(
        [...users]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      );
      setIsLoading(false);
    }
    void load();
  }, []);

  if (isLoading || !statistics) return <PageSpinner />;

  const stats = [
    { label: 'Total Users',         value: statistics.totalUsers.toLocaleString(),            icon: Users,      tone: 'brand'  as const },
    { label: 'Total Transactions',  value: statistics.totalTransactions.toLocaleString(),     icon: Receipt,    tone: 'blue'   as const },
    { label: 'System Categories',   value: statistics.totalCategories.toLocaleString(),       icon: ListTree,   tone: 'purple' as const },
    { label: 'Active (30d)',         value: statistics.activeUsersLast30Days.toLocaleString(), icon: Activity,   tone: 'amber'  as const },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Admin Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          Platform overview and quick actions.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Avg monthly spend highlight */}
      {statistics.averageMonthlySpendPerUser > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-brand-100 bg-brand-50 px-5 py-4 dark:border-primary/15 dark:bg-primary/8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-primary/20 dark:text-primary-accent">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">
              Average monthly spend per user
            </p>
            <p className="text-xs text-gray-500 dark:text-text-secondary">
              ₦{statistics.averageMonthlySpendPerUser.toLocaleString(undefined, { maximumFractionDigits: 0 })} across all active accounts
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent users */}
        <Card noPadding className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-white/[0.04]">
            <h2 className="font-semibold text-gray-900 dark:text-text-primary">Recent Sign-ups</h2>
            <Link
              to={ADMIN_ROUTES.users}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-primary-accent"
            >
              View all →
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <div className="p-6">
              <EmptyState compact icon={Users} title="No students yet" description="New sign-ups will appear here." />
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {recentUsers.map((u) => (
                <Link
                  key={u.id}
                  to={buildPath(ADMIN_ROUTES.userDetail, { id: u.id })}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-text-primary">{u.fullName}</p>
                      <p className="truncate text-xs text-gray-400 dark:text-text-muted">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={u.isActive ? 'success' : 'neutral'}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                    <span className="hidden text-xs text-gray-400 dark:text-text-muted sm:block">
                      {formatDate(u.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Quick Actions</h2>
          <div className="mt-3 space-y-2">
            {quickActions.map(({ label, icon: Icon, to, desc }) => (
              <Link
                key={label}
                to={to}
                className={[
                  'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium',
                  'border-gray-100 text-gray-700 transition-all duration-150',
                  'hover:-translate-y-px hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800',
                  'dark:border-white/5 dark:text-text-secondary',
                  'dark:hover:border-amber-400/25 dark:hover:bg-amber-400/8 dark:hover:text-amber-300',
                ].join(' ')}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors dark:bg-white/8 dark:text-text-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-text-muted">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
