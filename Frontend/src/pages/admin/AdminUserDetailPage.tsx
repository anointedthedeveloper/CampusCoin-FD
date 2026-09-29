import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Calendar,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Pencil,
  ShieldCheck,
  ListTree,
  Mail,
  Receipt,
  RotateCcw,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { Avatar, Badge, Card, ConfirmDialog, EmptyState, PageSpinner } from '@/components/common';
import { ADMIN_ROUTES } from '@/constants/routes';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { adminUserService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import type { AdminUserDetail } from '@/types/admin';

type ActionKind = 'suspend' | 'activate' | 'reset' | 'delete' | 'promote' | 'demote' | 'send-reset';

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<AdminUserDetail | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const showLoader = useMinLoadTime(isLoading);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pending, setPending] = useState<ActionKind | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await adminUserService.getUserById(id!);
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) setUser(undefined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id, refreshToken]);

  if (showLoader) return <PageSpinner label="Loading user…" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={Users}
          title="User not found"
          description="This account may have been deleted."
          action={
            <Link to={ADMIN_ROUTES.users} className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent">
              Back to users
            </Link>
          }
        />
      </div>
    );
  }

  const isSelf = user.id === currentUser?.id;
  const currency = user.settings?.currency ?? DEFAULT_CURRENCY;

  async function runAction() {
    if (!user || !pending) return;
    if (pending === 'suspend' || pending === 'activate') {
      await adminUserService.setActive(user.id, pending === 'activate');
      setFlash(pending === 'activate' ? 'Account reactivated.' : 'Account suspended. The user has been signed out.');
      setRefreshToken((t) => t + 1);
    } else if (pending === 'promote' || pending === 'demote') {
      await adminUserService.update(user.id, { role: pending === 'promote' ? 'admin' : 'student' });
      setFlash(pending === 'promote' ? 'User is now an administrator.' : 'Admin access removed — the user is now a student.');
      setRefreshToken((t) => t + 1);
    } else if (pending === 'send-reset') {
      setFlash(await adminUserService.sendPasswordReset(user.id));
    } else if (pending === 'reset') {
      await adminUserService.resetAccount(user.id);
      setFlash('Account data reset to a fresh start.');
      setRefreshToken((t) => t + 1);
    } else {
      await adminUserService.remove(user.id);
      navigate(ADMIN_ROUTES.users, { replace: true });
    }
  }

  const dialog = pending && {
    suspend: { title: `Suspend ${user.fullName}?`, description: 'They will be signed out immediately and cannot log in until reactivated. Their data is kept.', confirmLabel: 'Suspend user', tone: 'danger' as const },
    activate: { title: `Reactivate ${user.fullName}?`, description: 'They will be able to sign in again.', confirmLabel: 'Reactivate', tone: 'primary' as const },
    reset: { title: `Reset ${user.fullName}'s account?`, description: 'Deletes all transactions, budgets, recurring entries, notifications and bookmarks, restores default categories and restarts onboarding. Their login stays the same. This cannot be undone.', confirmLabel: 'Reset account', tone: 'danger' as const },
    promote: { title: `Make ${user.fullName} an administrator?`, description: 'They will get full access to the admin console, including other users.', confirmLabel: 'Make admin', tone: 'primary' as const },
    demote: { title: `Remove admin access from ${user.fullName}?`, description: 'They will become a regular student account.', confirmLabel: 'Remove admin access', tone: 'danger' as const },
    'send-reset': { title: `Send a password reset email to ${user.email}?`, description: 'They will get a 6-digit code and a one-click link to choose a new password. You never see their password.', confirmLabel: 'Send email', tone: 'primary' as const },
    delete: { title: `Delete ${user.fullName}?`, description: 'Permanently deletes this account and all of its financial records. This cannot be undone.', confirmLabel: 'Delete permanently', tone: 'danger' as const },
  }[pending];

  async function saveName() {
    if (!user) return;
    const value = nameDraft.trim();
    if (!value) { setNameError('Name cannot be empty.'); return; }
    try {
      await adminUserService.update(user.id, { fullName: value });
      setIsEditingName(false);
      setNameError(null);
      setFlash('Name updated.');
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not save the name.');
    }
  }

  const details = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: GraduationCap, label: 'School', value: user.school || '—' },
    { icon: GraduationCap, label: 'Academic year', value: user.academicYear || '—' },
    { icon: Wallet, label: 'Monthly allowance', value: user.monthlyAllowanceBaseline ? formatCurrency(user.monthlyAllowanceBaseline, currency) : '—' },
    { icon: Calendar, label: 'Joined', value: formatDate(user.createdAt) },
    { icon: Users, label: 'Role', value: user.role === 'admin' ? 'Administrator' : 'Student' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={ADMIN_ROUTES.users} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-text-secondary dark:hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-primary/25 dark:bg-primary/10 dark:text-primary-accent" role="status">
          <CheckCircle2 className="h-4 w-4" /> {flash}
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          open
          {...dialog}
          requireText={pending === 'delete' ? 'DELETE' : undefined}
          onConfirm={runAction}
          onClose={() => setPending(null)}
        />
      )}

      <Card noPadding className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-950 to-[#0f3a23] px-6 py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={user.fullName} size="lg" />
              <div>
                {isEditingName ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={100} aria-label="Full name" className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-base font-semibold text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-300/40" />
                    <button type="button" onClick={() => void saveName()} className="rounded-lg bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/30">Save</button>
                    <button type="button" onClick={() => { setIsEditingName(false); setNameError(null); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-white/70 hover:text-white">Cancel</button>
                    {nameError && <span className="w-full text-xs text-red-200">{nameError}</span>}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-xl font-bold">
                    {user.fullName}
                    <button type="button" onClick={() => { setNameDraft(user.fullName); setIsEditingName(true); }} aria-label="Edit name" className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'Active' : 'Suspended'}</Badge>
                  {user.role === 'admin' && <Badge tone="info">Admin</Badge>}
                </div>
              </div>
            </div>
            {isSelf ? (
              <span className="text-xs text-emerald-100/70">This is your account</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPending(user.isActive ? 'suspend' : 'activate')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                    user.isActive ? 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/25' : 'bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30',
                  )}
                >
                  {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {user.isActive ? 'Suspend' : 'Reactivate'}
                </button>
                <button type="button" onClick={() => setPending(user.role === 'admin' ? 'demote' : 'promote')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/20">
                  <ShieldCheck className="h-4 w-4" /> {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                </button>
                <button type="button" onClick={() => setPending('send-reset')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/20">
                  <KeyRound className="h-4 w-4" /> Send reset email
                </button>
                <button type="button" onClick={() => setPending('reset')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/20">
                  <RotateCcw className="h-4 w-4" /> Reset data
                </button>
                <button type="button" onClick={() => setPending('delete')} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3.5 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/30">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-white/[0.04] sm:grid-cols-4">
          {[
            { label: 'Transactions', value: user.transactionCount.toLocaleString(), icon: Receipt },
            { label: 'Total income', value: formatCurrency(user.totalIncome ?? 0, currency), icon: ArrowUpRight },
            { label: 'Total expenses', value: formatCurrency(user.totalExpense ?? 0, currency), icon: ArrowDownRight },
            { label: 'Categories / budgets', value: `${user.categoryCount ?? 0} / ${user.budgetCount ?? 0}`, icon: ListTree },
          ].map((stat) => (
            <div key={stat.label} className="bg-white px-5 py-4 dark:bg-surface-elevated">
              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-text-muted"><stat.icon className="h-3.5 w-3.5" />{stat.label}</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-text-primary">{stat.value}</p>
            </div>
          ))}
        </div>

        <dl className="grid gap-x-8 gap-y-3 px-6 py-5 sm:grid-cols-2">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" />
              <dt className="text-gray-500 dark:text-text-secondary">{label}</dt>
              <dd className="ml-auto truncate font-medium text-gray-900 dark:text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900 dark:text-text-primary">Recent Transactions</h2>
        {(user.recentTransactions ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-text-secondary">No transactions on record for this user.</p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100 dark:divide-white/[0.05]">
            {user.recentTransactions!.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900 dark:text-text-primary">{tx.description || tx.categoryName}</p>
                  <p className="text-xs text-gray-500 dark:text-text-muted">{tx.categoryName} · {formatDate(tx.occurredAt)}</p>
                </div>
                <span className={cn('shrink-0 font-semibold', tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-text-primary')}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
