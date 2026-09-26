import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, PageSpinner } from '@/components/common';
import { ADMIN_ROUTES, buildPath } from '@/constants/routes';
import { adminUserService } from '@/services';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { AdminUserSummary } from '@/types/admin';

export function AdminUsersPage() {
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState<'all' | 'student' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [users,        setUsers]        = useState<AdminUserSummary[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await adminUserService.listUsers();
      setUsers(data);
      setIsLoading(false);
    }
    void load();
  }, [refreshToken]);

  // Client-side filtering
  const filtered = users.filter((u) => {
    const matchesSearch =
      !search.trim() ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole   = roleFilter   === 'all' || u.role   === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? u.isActive : !u.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  async function toggleActive(id: string, isActive: boolean) {
    await adminUserService.setActive(id, !isActive);
    setRefreshToken((t) => t + 1);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Users</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          {users.length} registered user{users.length !== 1 ? 's' : ''} on the platform.
        </p>
      </div>

      {/* Filters bar */}
      <Card noPadding className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-muted" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-gray-900',
                'border-gray-200 hover:border-gray-300',
                'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                'dark:border-white/8 dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted',
                'dark:hover:border-white/15 dark:focus:border-primary-accent/70',
              )}
            />
          </div>

          {/* Role filter */}
          <div className="inline-flex shrink-0 rounded-lg bg-gray-100 p-1 dark:bg-white/8">
            {(['all', 'student', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition-colors duration-150',
                  roleFilter === r
                    ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-text-secondary',
                )}
              >
                {r === 'all' ? 'All roles' : r}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="inline-flex shrink-0 rounded-lg bg-gray-100 p-1 dark:bg-white/8">
            {(['all', 'active', 'suspended'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition-colors duration-150',
                  statusFilter === s
                    ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-text-secondary',
                )}
              >
                {s === 'all' ? 'All status' : s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users table */}
      <Card noPadding>
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              compact
              icon={Users}
              title={users.length === 0 ? 'No users yet' : 'No users match your filters'}
              description={users.length === 0 ? 'Registered students will appear here.' : 'Try adjusting the search or filters.'}
            />
          </div>
        ) : (
          <>
            {/* Column headers — md+ */}
            <div className="hidden border-b border-gray-50 px-5 py-2.5 dark:border-white/[0.04] md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:gap-4">
              {['User', 'Transactions', 'Joined', 'Status', ''].map((h, i) => (
                <span
                  key={`${h}-${i}`}
                  className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted"
                >
                  {h}
                </span>
              ))}
            </div>

            <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                >
                  {/* Name + email */}
                  <Link
                    to={buildPath(ADMIN_ROUTES.userDetail, { id: u.id })}
                    className="flex flex-1 min-w-0 items-center gap-3"
                  >
                    <Avatar name={u.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">
                        {u.fullName}
                      </p>
                      <p className="truncate text-xs text-gray-400 dark:text-text-muted">{u.email}</p>
                    </div>
                  </Link>

                  {/* Transaction count */}
                  <span className="hidden text-xs font-medium text-gray-500 dark:text-text-secondary md:block w-24">
                    {u.transactionCount} txn{u.transactionCount !== 1 ? 's' : ''}
                  </span>

                  {/* Joined date */}
                  <span className="hidden text-xs text-gray-400 dark:text-text-muted md:block w-24">
                    {formatDate(u.createdAt)}
                  </span>

                  {/* Status badge */}
                  <Badge tone={u.isActive ? 'success' : 'neutral'} className="shrink-0">
                    {u.isActive ? 'Active' : 'Suspended'}
                  </Badge>

                  {/* Suspend / Activate button */}
                  <button
                    type="button"
                    onClick={() => void toggleActive(u.id, u.isActive)}
                    className={cn(
                      'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 hover:-translate-y-px',
                      u.isActive
                        ? 'border-red-100 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/8'
                        : 'border-brand-100 text-brand-700 hover:bg-brand-50 dark:border-primary/20 dark:text-primary-accent dark:hover:bg-primary/8',
                    )}
                  >
                    {u.isActive ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>

            {/* Footer count */}
            <div className="border-t border-gray-50 px-5 py-3 dark:border-white/[0.04]">
              <p className="text-xs text-gray-400 dark:text-text-muted">
                Showing {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
