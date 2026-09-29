import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Brain, Coins, Moon, SlidersHorizontal, Sun, Type } from 'lucide-react';
import { SessionsCard } from '@/components/settings/SessionsCard';
import { BackupsCard } from '@/components/settings/BackupsCard';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';
import { Button, Card, Input } from '@/components/common';
import { CURRENCY_OPTIONS, DEFAULT_BUDGET_ALERT_THRESHOLD, DEFAULT_CURRENCY } from '@/constants/config';
import { profileService } from '@/services';
import { ApiError } from '@/types/api';
import type { UserSettings } from '@/types/user';
import { FONT_SCALES, getFontScale, setFontScale, type FontScaleId } from '@/utils/fontScale';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_SETTINGS: UserSettings = {
  currency: DEFAULT_CURRENCY,
  monthlyIncomeGoal: null,
  budgetAlertThreshold: DEFAULT_BUDGET_ALERT_THRESHOLD,
  emailNotifications: true,
  pushNotifications: true,
  aiCategorizationEnabled: false,
  aiInsightsEnabled: false,
};

const TOGGLES = [
  { key: 'emailNotifications', label: 'Email notifications', description: 'Email me budget and limit alerts, announcements and support replies.', icon: Bell },
  { key: 'pushNotifications', label: 'In-app alerts', description: 'Show budget alerts and reminders in the notification bell.', icon: Bell },
  { key: 'aiCategorizationEnabled', label: 'AI category suggestions', description: 'Suggest a category as you type a transaction description.', icon: Brain },
  { key: 'aiInsightsEnabled', label: 'AI monthly insights', description: 'Write a plain-language summary of each month’s spending.', icon: Brain },
] as const;

export function SettingsPage() {
  const { refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [fontScale, setFontScaleState] = useState<FontScaleId>(getFontScale);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    profileService.getSettings()
      .then((value) => { if (active) setSettings({ ...DEFAULT_SETTINGS, ...value }); })
      .catch(() => { if (active) setLoadError('Settings could not be loaded. Check your connection and try again.'); });
    return () => { active = false; };
  }, []);

  function updateSetting<Key extends keyof UserSettings>(key: Key, value: UserSettings[Key]) {
    setSettings((current) => current ? { ...current, [key]: value } : current);
    setSaved(false);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const updated = await profileService.updateSettings(settings);
      setSettings({ ...DEFAULT_SETTINGS, ...updated });
      // Keep the signed-in user in sync so changes (currency, AI features)
      // apply across the app without a reload.
      await refreshUser().catch(() => undefined);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : 'Settings could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (loadError) {
    return <div role="alert" className="mx-auto max-w-6xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400">{loadError}</div>;
  }
  if (!settings) {
    return <p role="status" className="mx-auto max-w-6xl py-8 text-sm text-gray-500 dark:text-text-muted">Loading settings…</p>;
  }

  const saveBar = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {saveError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
      {saved && <p role="status" className="text-sm font-medium text-brand-700 dark:text-primary-accent">Settings saved.</p>}
      <Button type="submit" form="settings-form" variant="primary" isLoading={isSaving}>Save settings</Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Preferences, notifications, devices and backups for your account.</p>
        </div>
        <div className="hidden lg:block">{saveBar}</div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <form id="settings-form" onSubmit={handleSave} className="space-y-5">
          <Card>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-brand-600 dark:text-primary-accent" />
              <h2 className="font-semibold text-gray-900 dark:text-text-primary">Money preferences</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-currency" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Currency</label>
                <select id="settings-currency" value={settings.currency} onChange={(event) => updateSetting('currency', event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary">
                  {CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <Input
                label="Monthly income goal"
                type="number"
                min="0"
                step="0.01"
                value={settings.monthlyIncomeGoal ?? ''}
                onChange={(event) => updateSetting('monthlyIncomeGoal', event.target.value === '' ? null : Math.max(0, Number(event.target.value)))}
                placeholder="Optional"
              />
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="budget-alert-threshold" className="text-sm font-medium text-gray-700 dark:text-text-secondary">Warn me when a budget is</label>
                <output htmlFor="budget-alert-threshold" className="text-sm font-semibold text-gray-900 dark:text-text-primary">{settings.budgetAlertThreshold}% used</output>
              </div>
              <input id="budget-alert-threshold" type="range" min="1" max="100" value={settings.budgetAlertThreshold} onChange={(event) => updateSetting('budgetAlertThreshold', Number(event.target.value))} className="mt-3 w-full accent-brand-600" />
              <p className="mt-1 text-xs text-gray-500 dark:text-text-muted">You always get a second alert when a budget is fully used.</p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand-600 dark:text-primary-accent" />
              <h2 className="font-semibold text-gray-900 dark:text-text-primary">Notifications and AI features</h2>
            </div>
            <div className="mt-2 divide-y divide-gray-100 dark:divide-white/[0.06]">
              {TOGGLES.map(({ key, label, description, icon: Icon }) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-3">
                  <span className="flex min-w-0 items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" />
                    <span>
                      <span className="block text-sm font-medium text-gray-800 dark:text-text-primary">{label}</span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-text-muted">{description}</span>
                    </span>
                  </span>
                  <input type="checkbox" checked={settings[key]} onChange={(event) => updateSetting(key, event.target.checked)} className="h-4 w-4 shrink-0 rounded border-gray-300 accent-brand-600" />
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-brand-600 dark:text-primary-accent" />
              <h2 className="font-semibold text-gray-900 dark:text-text-primary">Appearance and accessibility</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-text-muted">These apply straight away on this device.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-20 text-sm font-medium text-gray-700 dark:text-text-secondary">Theme</span>
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={theme === mode}
                  onClick={() => { if (theme !== mode) toggleTheme(); }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm capitalize',
                    theme === mode
                      ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:border-primary-accent dark:bg-primary/10 dark:text-primary-accent'
                      : 'border-gray-200 font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5',
                  )}
                >
                  {mode === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {mode}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Text size">
              <span className="w-20 text-sm font-medium text-gray-700 dark:text-text-secondary">Text size</span>
              {FONT_SCALES.map((scale) => (
                <button
                  key={scale.id}
                  type="button"
                  role="radio"
                  aria-checked={fontScale === scale.id}
                  onClick={() => { setFontScale(scale.id); setFontScaleState(scale.id); }}
                  className={
                    fontScale === scale.id
                      ? 'rounded-lg border border-brand-500 bg-brand-50 px-4 py-2 font-semibold text-brand-700 dark:border-primary-accent dark:bg-primary/10 dark:text-primary-accent'
                      : 'rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5'
                  }
                  style={{ fontSize: `${scale.px - 2}px` }}
                >
                  {scale.label}
                </button>
              ))}
            </div>
          </Card>

          <div className="lg:hidden">{saveBar}</div>
        </form>

        <div className="space-y-5">
          <SessionsCard />
          <BackupsCard />
        </div>
      </div>
    </div>
  );
}
