import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, RotateCcw, Search, Trash2, Users } from 'lucide-react';
import { Avatar, Badge, Card, ConfirmDialog, EmptyState, PageSpinner } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROUTES, buildPath } from '@/constants/routes';
import { adminUserService } from '@/services';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import type { AdminUserSummary } from '@/types/admin';

type PendingAction = { kind: 'suspend' | 'activate' | 'reset' | 'delete'; user: AdminUserSummary } | null;

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState<'all' | 'student' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [users,        setUsers]        = useState<AdminUserSummary[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const showLoader = useMinLoadTime(isLoading);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        setUsers((await adminUserService.listUsers()) ?? []);
      } catch {
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
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

  async function runPendingAction() {
    if (!pendingAction) return;
    const { kind, user: target } = pendingAction;
    if (kind === 'suspend' || kind === 'activate') {
      await adminUserService.setActive(target.id, kind === 'activate');
      setFlash(`${target.fullName} was ${kind === 'activate' ? 'reactivated' : 'suspended'}.`);
    } else if (kind === 'reset') {
      await adminUserService.resetAccount(target.id);
      setFlash(`${target.fullName}'s account data was reset.`);
    } else {
      await adminUserService.remove(target.id);
      setFlash(`${target.fullName} was deleted.`);
    }
    setRefreshToken((t) => t + 1);
  }

  const dialogCopy = pendingAction && {
    suspend: {
      title: `Suspend ${pendingAction.user.fullName}?`,
      description: 'They will be signed out immediately and cannot log in until you reactivate the account. Their data is kept.',
      confirmLabel: 'Suspend user',
      tone: 'danger' as const,
    },
    activate: {
      title: `Reactivate ${pendingAction.user.fullName}?`,
      description: 'They will be able to sign in again.',
      confirmLabel: 'Reactivate',
      tone: 'primary' as const,
    },
    reset: {
      title: `Reset ${pendingAction.user.fullName}'s account?`,
      description: 'Deletes all of their transactions, budgets, recurring entries, notifications and bookmarks, restores the default categories and restarts onboarding. Their login stays the same. This cannot be undone.',
      confirmLabel: 'Reset account',
      tone: 'danger' as const,
    },
    delete: {
      title: `Delete ${pendingAction.user.fullName}?`,
      description: 'Permanently deletes this account and all of its financial records. This cannot be undone.',
      confirmLabel: 'Delete permanently',
      tone: 'danger' as const,
    },
  }[pendingAction.kind];

  if (showLoader) return <PageSpinner label="Loading users…" />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Users</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          {users.length} registered user{users.length !== 1 ? 's' : ''} on the platform.
        </p>
      </div>

      {flash && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-primary/25 dark:bg-primary/10 dark:text-primary-accent" role="status">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{flash}</span>
          <button type="button" onClick={() => setFlash(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {dialogCopy && pendingAction && (
        <ConfirmDialog
          open
          {...dialogCopy}
          requireText={pendingAction.kind === 'delete' ? 'DELETE' : undefined}
          onConfirm={runPendingAction}
          onClose={() => setPendingAction(null)}
        />
      )}

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
                'dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted',
                'dark:hover:border-white/15 dark:focus:border-primary-accent/70',
              )}
            />
          </div>

          {/* Role filter */}
          <div className="inline-flex shrink-0 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.08]">
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
          <div className="inline-flex shrink-0 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.08]">
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
            <div className="hidden items-center gap-3 border-b border-gray-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-white/[0.04] dark:text-text-muted md:flex">
              <span className="flex-1">User</span>
              <span className="w-28">Transactions</span>
              <span className="w-28">Joined</span>
              <span className="w-20">Status</span>
              <span className="w-[7.5rem] text-right">Actions</span>
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
                      <p className="truncate text-xs text-gray-400 dark:text-text-muted">{u.email}{u.role === 'admin' && <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">admin</span>}</p>
                    </div>
                  </Link>

                  {/* Transaction count */}
                  <span className="hidden text-xs font-medium text-gray-500 dark:text-text-secondary md:block w-28">
                    {u.transactionCount} txn{u.transactionCount !== 1 ? 's' : ''}
                  </span>

                  {/* Joined date */}
                  <span className="hidden text-xs text-gray-400 dark:text-text-muted md:block w-28">
                    {formatDate(u.createdAt)}
                  </span>

                  {/* Status badge */}
                  <span className="w-20 shrink-0">
                    <Badge tone={u.isActive ? 'success' : 'danger'}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </span>

                  {/* Actions — your own account can't be suspended, reset or deleted here */}
                  {u.id === currentUser?.id ? (
                    <span className="w-[7.5rem] shrink-0 text-right text-xs font-medium text-gray-400 dark:text-text-muted">You</span>
                  ) : (
                    <div className="flex w-[7.5rem] shrink-0 items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setPendingAction({ kind: u.isActive ? 'suspend' : 'activate', user: u })}
                        title={u.isActive ? 'Suspend' : 'Reactivate'}
                        aria-label={`${u.isActive ? 'Suspend' : 'Reactivate'} ${u.fullName}`}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                          u.isActive
                            ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-400 dark:hover:bg-amber-400/10'
                            : 'border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-primary/25 dark:text-primary-accent dark:hover:bg-primary/10',
                        )}
                      >
                        {u.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingAction({ kind: 'reset', user: u })}
                        title="Reset account data"
                        aria-label={`Reset ${u.fullName}'s account data`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingAction({ kind: 'delete', user: u })}
                        title="Delete user"
                        aria-label={`Delete ${u.fullName}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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
