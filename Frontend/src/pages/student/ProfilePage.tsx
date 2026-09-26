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

function ChangePasswordPanel({ userId }: { userId: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePassword(userId, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 py-3">
      <Input
        label="Current Password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      <Input
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      <Input
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="text-sm text-brand-600 dark:text-primary-accent">Password updated.</p>}
      <Button type="submit" variant="outline" isLoading={isSubmitting}>
        Update Password
      </Button>
    </form>
  );
}

function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    profileService.getSettings().then(setSettings);
  }, []);

  async function handleToggle(key: 'emailNotifications' | 'pushNotifications') {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await profileService.updateSettings({ [key]: !settings[key] });
      setSettings(updated);
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings) return <p className="py-3 text-sm text-gray-500 dark:text-text-secondary">Loading settings…</p>;

  return (
    <div className="space-y-3 py-3">
      {(
        [
          { key: 'emailNotifications' as const, label: 'Email notifications' },
          { key: 'pushNotifications' as const, label: 'Push notifications' },
        ]
      ).map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-text-secondary">
          {label}
          <input
            type="checkbox"
            checked={settings[key]}
            disabled={isSaving}
            onChange={() => void handleToggle(key)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-surface"
          />
        </label>
      ))}
    </div>
  );
}

function PrivacySecurityPanel() {
  return (
    <div className="space-y-2 py-3 text-sm text-gray-600 dark:text-text-secondary">
      <p>Your transactions, budgets, and profile are stored securely on the server and tied only to your account.</p>
      <p>Passwords are hashed before being stored — Campus Coin never sees or stores your password in plain text.</p>
      <p>Nothing is shared with third parties. You can request account deletion at any time from Help &amp; FAQ.</p>
    </div>
  );
}

const settingsLinks: { key: Exclude<SettingsPanel, null>; label: string; icon: typeof KeyRound }[] = [
  { key: 'password', label: 'Change Password', icon: KeyRound },
  { key: 'notifications', label: 'Notification Settings', icon: Bell },
  { key: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
];

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [school, setSchool] = useState(user?.school ?? '');
  const [academicYear, setAcademicYear] = useState(user?.academicYear ?? '');
  const [monthlyAllowance, setMonthlyAllowance] = useState(
    user?.monthlyAllowanceBaseline !== undefined ? String(user.monthlyAllowanceBaseline) : '',
  );
  const [savingsGoal, setSavingsGoal] = useState(
    user?.savingsGoalAmount !== undefined ? String(user.savingsGoalAmount) : '',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<SettingsPanel>(null);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Full name cannot be empty.');
      return;
    }

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
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={user?.fullName ?? 'Student'} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 dark:text-text-primary">{user?.fullName}</h1>
            <p className="truncate text-sm text-gray-500 dark:text-text-secondary">{user?.email}</p>
            {(user?.school || user?.academicYear) && (
              <span className="mt-1 inline-block max-w-full truncate rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                {[user?.school, user?.academicYear].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <Link
          to={`${STUDENT_ROUTES.onboarding}?edit=1`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-100 dark:border-primary-accent/30 dark:bg-primary-accent/10 dark:text-primary-accent dark:hover:bg-primary-accent/15"
        >
          <Wand2 className="h-4 w-4" />
          Update Financial Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Personal Information</h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input label="School" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. University of Lagos" />
            <Input
              label="Academic Year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 300 Level"
            />
            <Input
              label="Monthly Allowance Baseline"
              type="number"
              min="0"
              step="0.01"
              value={monthlyAllowance}
              onChange={(e) => setMonthlyAllowance(e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Savings Goal"
              type="number"
              min="0"
              step="0.01"
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
              placeholder="Optional"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {savedAt && !error && <p className="text-sm text-brand-600 dark:text-primary-accent">Changes saved.</p>}
            <Button type="submit" variant="primary" className="w-full" isLoading={isSaving}>
              Save Changes
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Account Settings</h2>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
            {settingsLinks.map(({ key, label, icon: Icon }) => {
              const isOpen = expandedPanel === key;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setExpandedPanel(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between py-3 text-left text-sm text-gray-700 transition-colors duration-200 hover:text-brand-700 dark:text-text-secondary dark:hover:text-primary-accent"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-gray-400 dark:text-text-muted" />
                      {label}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-gray-300 transition-transform duration-200 dark:text-text-muted', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-50 dark:border-white/10">
                      {key === 'password' && user && <ChangePasswordPanel userId={user.id} />}
                      {key === 'notifications' && <NotificationSettingsPanel />}
                      {key === 'privacy' && <PrivacySecurityPanel />}
                    </div>
                  )}
                </div>
              );
            })}
            <Link
              to={PUBLIC_ROUTES.faq}
              className="flex w-full items-center gap-3 py-3 text-left text-sm text-gray-700 transition-colors duration-200 hover:text-brand-700 dark:text-text-secondary dark:hover:text-primary-accent"
            >
              <HelpCircle className="h-4 w-4 text-gray-400 dark:text-text-muted" />
              Help & FAQ
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 py-3 text-left text-sm font-medium text-red-600 transition-colors duration-200 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
