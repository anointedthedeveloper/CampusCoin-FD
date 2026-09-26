import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, HelpCircle, KeyRound, LogOut, ShieldCheck, Wand2 } from 'lucide-react';
import { Avatar, Button, Card, Input } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { authService, profileService } from '@/services';
import { PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { UserSettings } from '@/types/user';

type SettingsPanel = 'password' | 'notifications' | 'privacy' | null;

/* ── Change-password sub-panel ─────────────────────────────────── */
function ChangePasswordPanel({ userId }: { userId: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(false);
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    setIsPending(true);
    try {
      await authService.changePassword(userId, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your password. Please try again.');
    } finally { setIsPending(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 pb-1">
      <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
      <Input label="New Password"     type="password" value={newPassword}     onChange={(e) => setNewPassword(e.target.value)}     autoComplete="new-password"     required />
      <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password"     required />
      {error   && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="text-sm font-medium text-brand-600 dark:text-primary-accent">Password updated successfully.</p>}
      <Button type="submit" variant="outline" size="sm" isLoading={isPending}>Update Password</Button>
    </form>
  );
}

/* ── Notification-settings sub-panel ───────────────────────────── */
function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { profileService.getSettings().then(setSettings); }, []);

  async function handleToggle(key: 'emailNotifications' | 'pushNotifications') {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await profileService.updateSettings({ [key]: !settings[key] });
      setSettings(updated);
    } finally { setIsSaving(false); }
  }

  if (!settings) return <p className="py-3 text-sm text-gray-400 dark:text-text-muted">Loading settings…</p>;

  return (
    <div className="space-y-2 pt-3 pb-1">
      {([
        { key: 'emailNotifications' as const, label: 'Email notifications' },
        { key: 'pushNotifications'  as const, label: 'Push notifications' },
      ]).map(({ key, label }) => (
        <label
          key={key}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">{label}</span>
          {/* Toggle switch */}
          <div className="relative shrink-0 h-5 w-9" onClick={() => void handleToggle(key)}>
            <input type="checkbox" className="sr-only" checked={settings[key]} disabled={isSaving} readOnly />
            <div className={cn(
              'h-5 w-9 rounded-full transition-colors duration-200',
              settings[key] ? 'bg-brand-600 dark:bg-primary-accent' : 'bg-gray-200 dark:bg-white/15',
            )} />
            <div className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
              settings[key] ? 'translate-x-4' : 'translate-x-0.5',
            )} />
          </div>
        </label>
      ))}
    </div>
  );
}

/* ── Privacy sub-panel ─────────────────────────────────────────── */
function PrivacySecurityPanel() {
  return (
    <div className="space-y-2 pt-3 pb-1 text-sm leading-relaxed text-gray-500 dark:text-text-secondary">
      <p>Your transactions, budgets, and profile are stored securely and tied only to your account.</p>
      <p>Passwords are hashed before storage — Campus Coin never sees your plain-text password.</p>
      <p>Nothing is shared with third parties. You can request account deletion at any time from Help &amp; FAQ.</p>
    </div>
  );
}

const SETTINGS_ITEMS: { key: Exclude<SettingsPanel, null>; label: string; icon: typeof KeyRound }[] = [
  { key: 'password',      label: 'Change Password',    icon: KeyRound },
  { key: 'notifications', label: 'Notifications',      icon: Bell },
  { key: 'privacy',       label: 'Privacy & Security', icon: ShieldCheck },
];

/* ── Main page ─────────────────────────────────────────────────── */
export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();

  const [fullName,         setFullName]         = useState(user?.fullName ?? '');
  const [school,           setSchool]           = useState(user?.school ?? '');
  const [academicYear,     setAcademicYear]     = useState(user?.academicYear ?? '');
  const [monthlyAllowance, setMonthlyAllowance] = useState(
    user?.monthlyAllowanceBaseline !== undefined ? String(user.monthlyAllowanceBaseline) : '',
  );
  const [savingsGoal, setSavingsGoal] = useState(
    user?.savingsGoalAmount !== undefined ? String(user.savingsGoalAmount) : '',
  );
  const [isSaving,      setIsSaving]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [savedAt,       setSavedAt]       = useState<number | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<SettingsPanel>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
      await refreshUser();
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally { setIsSaving(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── Profile hero card ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-card dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-dark-card">
        <div className="flex items-center gap-4">
          <Avatar name={user?.fullName ?? 'Student'} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 dark:text-text-primary">
              {user?.fullName}
            </h1>
            <p className="truncate text-sm text-gray-500 dark:text-text-secondary">{user?.email}</p>
            {(user?.school || user?.academicYear) && (
              <span className="mt-1.5 inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-primary/15 dark:text-primary-accent">
                {[user?.school, user?.academicYear].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <Link
          to={`${STUDENT_ROUTES.onboarding}?edit=1`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 shadow-btn transition-all hover:-translate-y-px hover:bg-brand-100 dark:border-primary-accent/25 dark:bg-primary/10 dark:text-primary-accent dark:hover:bg-primary/15"
        >
          <Wand2 className="h-4 w-4" />
          Update Financial Profile
        </Link>
      </div>

      {/* ── Two-column content ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Personal info form */}
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Personal Information</h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="School"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. University of Lagos"
            />
            <Input
              label="Academic Year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 300 Level"
            />
            <Input
              label="Monthly Allowance Baseline"
              type="number" min="0" step="0.01"
              value={monthlyAllowance}
              onChange={(e) => setMonthlyAllowance(e.target.value)}
              placeholder="Optional"
              hint="Used to benchmark your monthly savings rate."
            />
            <Input
              label="Savings Goal"
              type="number" min="0" step="0.01"
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
              placeholder="Optional"
              hint="Your target balance — shown as a progress bar on the dashboard."
            />

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </div>
            )}
            {savedAt && !error && (
              <p className="text-sm font-medium text-brand-600 dark:text-primary-accent">
                ✓ Changes saved.
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isSaving}>
              Save Changes
            </Button>
          </form>
        </Card>

        {/* Account settings */}
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Account Settings</h2>

          <div className="mt-4 divide-y divide-gray-50 dark:divide-white/[0.04]">
            {SETTINGS_ITEMS.map(({ key, label, icon: Icon }) => {
              const isOpen = expandedPanel === key;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setExpandedPanel(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:text-brand-700 dark:text-text-secondary dark:hover:text-primary-accent"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-text-muted">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {label}
                    </span>
                    <ChevronDown className={cn(
                      'h-4 w-4 text-gray-300 transition-transform duration-200 dark:text-text-muted',
                      isOpen && 'rotate-180',
                    )} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-50 dark:border-white/[0.04]">
                      {key === 'password'      && user && <ChangePasswordPanel userId={user.id} />}
                      {key === 'notifications' && <NotificationSettingsPanel />}
                      {key === 'privacy'       && <PrivacySecurityPanel />}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Help link */}
            <Link
              to={PUBLIC_ROUTES.faq}
              className="flex w-full items-center gap-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:text-brand-700 dark:text-text-secondary dark:hover:text-primary-accent"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-text-muted">
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
              Help &amp; FAQ
            </Link>

            {/* Log out */}
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
                <LogOut className="h-3.5 w-3.5" />
              </span>
              Log Out
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
