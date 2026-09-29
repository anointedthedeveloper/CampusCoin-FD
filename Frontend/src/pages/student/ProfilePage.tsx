import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, DatabaseBackup, HelpCircle, KeyRound, LogOut, Settings, ShieldCheck, Wand2 } from 'lucide-react';
import { Avatar, Badge, Button, Card, FormattedNumberInput, Input } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { authService, profileService } from '@/services';
import { STUDENT_ROUTES } from '@/constants/routes';
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from '@/constants/config';
import { FINANCIAL_GOAL_OPTIONS, INCOME_FREQUENCY_OPTIONS, INCOME_SOURCE_OPTIONS, SPENDING_CATEGORY_OPTIONS } from '@/constants/onboarding';
import { formatCurrency } from '@/utils/format';
import { isStrongPassword } from '@/utils/validation';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';

function labelsFor(values: string[] | undefined, options: { value: string; label: string }[], other?: string) {
  return (values ?? []).map((v) => (v === 'other' && other ? other : options.find((o) => o.value === v)?.label ?? v));
}

/* ── Password card ─────────────────────────────────────────────── */
function PasswordCard() {
  const { user, refreshUser } = useAuth();
  const hasPassword = user?.hasPassword !== false;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!isStrongPassword(newPassword)) { setMessage({ ok: false, text: 'Use at least 8 characters.' }); return; }
    if (newPassword !== confirmPassword) { setMessage({ ok: false, text: 'The new passwords do not match.' }); return; }
    setIsPending(true);
    try {
      await authService.changePassword(user!.id, currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      await refreshUser().catch(() => undefined);
      setMessage({ ok: true, text: hasPassword ? 'Password changed. Other devices were signed out.' : 'Password set — you can now sign in with email and password too.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Could not change your password. Please try again.' });
    } finally { setIsPending(false); }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-text-primary"><KeyRound className="h-4 w-4 text-brand-600 dark:text-primary-accent" /> {hasPassword ? 'Change password' : 'Set a password'}</h2>
      {!hasPassword && <p className="mt-1 text-xs text-gray-500 dark:text-text-muted">You sign in with Google. Add a password to also sign in with your email.</p>}
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-2">
        {hasPassword && (
          <div className="sm:col-span-2">
            <Input label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
          </div>
        )}
        <Input label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required hint="At least 8 characters" />
        <Input label="Confirm new password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
        {message && <p role={message.ok ? 'status' : 'alert'} className={cn('text-sm sm:col-span-2', message.ok ? 'font-medium text-brand-700 dark:text-primary-accent' : 'text-red-600 dark:text-red-400')}>{message.text}</p>}
        <div className="sm:col-span-2"><Button type="submit" variant="outline" size="sm" isLoading={isPending}>{hasPassword ? 'Update password' : 'Set password'}</Button></div>
      </form>
    </Card>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [school, setSchool] = useState(user?.school ?? '');
  const [academicYear, setAcademicYear] = useState(user?.academicYear ?? '');
  const [monthlyAllowance, setMonthlyAllowance] = useState(user?.monthlyAllowanceBaseline != null ? String(user.monthlyAllowanceBaseline) : '');
  const [savingsGoal, setSavingsGoal] = useState(user?.savingsGoalAmount != null ? String(user.savingsGoalAmount) : '');
  const [currency, setCurrency] = useState(user?.settings?.currency ?? DEFAULT_CURRENCY);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Keep the form in step when the money profile is edited elsewhere.
  useEffect(() => {
    if (!user) return;
    setMonthlyAllowance(user.monthlyAllowanceBaseline != null ? String(user.monthlyAllowanceBaseline) : '');
    setSavingsGoal(user.savingsGoalAmount != null ? String(user.savingsGoalAmount) : '');
    setCurrency(user.settings?.currency ?? DEFAULT_CURRENCY);
  }, [user?.monthlyAllowanceBaseline, user?.savingsGoalAmount, user?.settings?.currency]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!fullName.trim()) { setError('Full name cannot be empty.'); return; }
    setIsSaving(true);
    try {
      await profileService.updateProfile({
        fullName: fullName.trim(),
        school: school.trim() || undefined,
        academicYear: academicYear.trim() || undefined,
        monthlyAllowanceBaseline: monthlyAllowance ? Number(monthlyAllowance) : undefined,
        savingsGoalAmount: savingsGoal ? Number(savingsGoal) : undefined,
      });
      await profileService.updateSettings({ currency });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally { setIsSaving(false); }
  }

  const ob = user?.onboarding;
  const incomeLabels = labelsFor(ob?.incomeSources, INCOME_SOURCE_OPTIONS, ob?.otherIncomeSource);
  const spendingLabels = labelsFor(ob?.spendingCategories, SPENDING_CATEGORY_OPTIONS, ob?.otherSpendingCategory);
  const goalLabels = labelsFor(ob?.goals, FINANCIAL_GOAL_OPTIONS);
  const frequency = INCOME_FREQUENCY_OPTIONS.find((f) => f.value === ob?.incomeFrequency)?.label;
  const cur = user?.settings?.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {notice && <div role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800 dark:border-primary/25 dark:bg-primary/10 dark:text-primary-accent">{notice}</div>}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-dark-card">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={user?.fullName ?? 'Student'} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 dark:text-text-primary">{user?.fullName}</h1>
            <p className="truncate text-sm text-gray-500 dark:text-text-secondary">{user?.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(user?.school || user?.academicYear) && <Badge tone="brand">{[user?.school, user?.academicYear].filter(Boolean).join(' · ')}</Badge>}
              {user?.hasGoogle && <Badge tone="info">Google linked</Badge>}
              <Badge tone="neutral">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={STUDENT_ROUTES.settings} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:-translate-y-px hover:bg-gray-50 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5">
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition-all hover:-translate-y-px hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* Personal details */}
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Personal details</h2>
          <p className="text-xs text-gray-500 dark:text-text-muted">Your name, school and the numbers Campus Coin measures you against.</p>
          <form onSubmit={handleSave} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required /></div>
            <Input label="School" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={100} placeholder="e.g. University of Lagos" />
            <Input label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} maxLength={100} placeholder="e.g. 300 Level" />
            <FormattedNumberInput label="Monthly allowance" value={monthlyAllowance} onChange={setMonthlyAllowance} placeholder="Optional" hint="Your usual monthly money in — alerts you when spending passes it." />
            <FormattedNumberInput label="Monthly savings goal" value={savingsGoal} onChange={setSavingsGoal} placeholder="Optional" hint="How much you want left over each month." />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="profile-currency" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Currency</label>
              <select id="profile-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary">
                {CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400 sm:col-span-2">{error}</div>}
            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" variant="primary" isLoading={isSaving}>Save changes</Button>
              {saved && !error && <p role="status" className="text-sm font-medium text-brand-600 dark:text-primary-accent">✓ Saved</p>}
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          {/* Money profile */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-text-primary">Money profile</h2>
                <p className="text-xs text-gray-500 dark:text-text-muted">What you told us when you set up — it shapes your tips, budgets and AI answers.</p>
              </div>
              <Link to={`${STUDENT_ROUTES.onboarding}?edit=1`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-primary/10 dark:text-primary-accent dark:hover:bg-primary/15">
                <Wand2 className="h-3.5 w-3.5" /> Edit money profile
              </Link>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { label: 'Money in', value: incomeLabels.length ? `${incomeLabels.join(', ')}${frequency ? ` · ${frequency.toLowerCase()}` : ''}` : null },
                { label: 'Usual amount', value: user?.monthlyAllowanceBaseline ? formatCurrency(user.monthlyAllowanceBaseline, cur) : null },
                { label: 'Spends most on', value: spendingLabels.length ? spendingLabels.join(', ') : null },
                { label: 'Goals', value: goalLabels.length ? goalLabels.join(', ') : null },
                { label: 'Savings target', value: user?.savingsGoalAmount ? formatCurrency(user.savingsGoalAmount, cur) : null },
              ].map((row) => (
                <div key={row.label} className="flex gap-3">
                  <dt className="w-28 shrink-0 text-gray-500 dark:text-text-muted">{row.label}</dt>
                  <dd className={cn('min-w-0 flex-1', row.value ? 'font-medium text-gray-900 dark:text-text-primary' : 'text-gray-400 dark:text-text-muted')}>{row.value ?? 'Not set'}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <PasswordCard />

          <Card noPadding>
            {[
              { to: STUDENT_ROUTES.settings, icon: DatabaseBackup, label: 'Backups, devices & notifications', hint: 'In Settings' },
              { to: STUDENT_ROUTES.help, icon: HelpCircle, label: 'Help & support', hint: 'FAQ, guides and chat with the team' },
              { to: STUDENT_ROUTES.help, icon: ShieldCheck, label: 'Privacy', hint: 'Your data is only ever visible to you. Ask support to delete your account.' },
            ].map(({ to, icon: Icon, label, hint }) => (
              <Link key={label} to={to} className="flex items-center gap-3 border-b border-gray-50 px-5 py-3 last:border-b-0 hover:bg-gray-50 dark:border-white/[0.04] dark:hover:bg-white/[0.03]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/[0.08] dark:text-text-muted"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-800 dark:text-text-primary">{label}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-text-muted">{hint}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
