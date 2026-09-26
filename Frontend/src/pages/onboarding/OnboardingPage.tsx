import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  PartyPopper,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button, Input, Logo } from '@/components/common';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services';
import { STUDENT_ROUTES } from '@/constants/routes';
import {
  FINANCIAL_GOAL_OPTIONS,
  INCOME_FREQUENCY_OPTIONS,
  INCOME_SOURCE_OPTIONS,
  SPENDING_CATEGORY_OPTIONS,
  TOTAL_ONBOARDING_STEPS,
} from '@/constants/onboarding';
import type { IncomeFrequency, OnboardingUpdate } from '@/types/user';
import { cn } from '@/utils/cn';

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * One-time post-signup setup. Lives outside StudentLayout (no sidebar) since
 * it's meant to be seen once, not as a permanent app section. Every step
 * persists to the backend immediately so progress survives a refresh, and
 * every step (except the final one) can be skipped without penalty.
 */
export function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === '1';

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  const [incomeSources, setIncomeSources] = useState<string[]>([]);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency | ''>('');
  const [spendingCategories, setSpendingCategories] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');

  // Redirect away only once, on arrival — never as a persistent guard, so a
  // completed/skipped user is never forced back through this flow just for
  // visiting the URL again (revisiting to edit is opt-in via ?edit=1).
  useEffect(() => {
    if (!user) return;
    const status = user.onboarding?.status ?? 'not_started';
    if (!isEditMode && (status === 'completed' || status === 'skipped')) {
      navigate(STUDENT_ROUTES.dashboard, { replace: true });
      return;
    }

    setIncomeSources(user.onboarding?.incomeSources ?? []);
    setIncomeFrequency(user.onboarding?.incomeFrequency ?? '');
    setSpendingCategories(user.onboarding?.spendingCategories ?? []);
    setGoals(user.onboarding?.goals ?? []);
    setIncomeAmount(user.monthlyAllowanceBaseline !== undefined ? String(user.monthlyAllowanceBaseline) : '');
    setSavingsTarget(user.savingsGoalAmount !== undefined ? String(user.savingsGoalAmount) : '');
    setStep(isEditMode ? 1 : Math.min(Math.max(user.onboarding?.currentStep ?? 1, 1), 5));
    // Only ever re-run this from a fresh user id, not on every field change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  async function persist(payload: OnboardingUpdate) {
    setIsSaving(true);
    setError(null);
    try {
      await profileService.updateOnboarding(payload);
      await refreshUser();
    } catch {
      setError("Couldn't save that — check your connection and try again.");
      throw new Error('onboarding-save-failed');
    } finally {
      setIsSaving(false);
    }
  }

  async function goToStep(next: number, extra: OnboardingUpdate = {}) {
    try {
      await persist({ currentStep: next, status: 'in_progress', ...extra });
      setStep(next);
    } catch {
      // error state already set by persist()
    }
  }

  async function handleFinishGoals() {
    setIsCreatingWallet(true);
    // A real minimum wait (not just a spinner) so the "creating your wallet"
    // moment reads as Campus Coin actually doing something on your behalf,
    // rather than an instant flash that undersells a brand-new account.
    const minimumDelay = new Promise((resolve) => setTimeout(resolve, 15000));
    try {
      await Promise.all([
        persist({
          goals,
          monthlyAllowanceBaseline: incomeAmount ? Number(incomeAmount) : undefined,
          savingsGoalAmount: savingsTarget ? Number(savingsTarget) : undefined,
          currentStep: 5,
          status: 'completed',
        }),
        minimumDelay,
      ]);
      setStep(5);
    } catch {
      // error state already set by persist()
    } finally {
      setIsCreatingWallet(false);
    }
  }

  async function handleSkip() {
    try {
      await persist({ currentStep: step, status: 'skipped' });
      navigate(STUDENT_ROUTES.dashboard, { replace: true });
    } catch {
      // error state already set by persist()
    }
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl">
        <Link to="/" className="mb-6 flex justify-center">
          <Logo showTagline />
        </Link>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-200/50 dark:border-white/10 dark:bg-surface-elevated dark:shadow-black/40 sm:p-8">
          {isCreatingWallet ? (
            <div className="animate-fade-in-up flex flex-col items-center py-6 text-center">
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                <Wallet className="h-7 w-7 animate-pulse" />
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/30 dark:bg-primary-accent/30" />
              </span>
              <h1 className="mt-5 text-xl font-bold text-gray-900 dark:text-text-primary">Creating your wallet…</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-text-secondary">
                Setting up your budget, categories, and savings tracking. This only takes a moment.
              </p>
            </div>
          ) : (
            <>
              {step <= TOTAL_ONBOARDING_STEPS && (
                <div className="mb-6">
                  <OnboardingProgress step={step} total={TOTAL_ONBOARDING_STEPS} />
                </div>
              )}

              {step === 1 && (
            <div className="animate-fade-in-up text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                <Coins className="h-6 w-6" />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-text-primary">
                Welcome to Campus Coin, {firstName}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-text-secondary">
                Let&apos;s set up your money profile so Campus Coin can give you more useful budgeting
                insights.
              </p>
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <Button variant="ghost" onClick={() => void handleSkip()} disabled={isSaving}>
                  Skip for now
                </Button>
                <Button onClick={() => void goToStep(2)} isLoading={isSaving}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in-up">
              <h1 className="text-xl font-bold text-gray-900 dark:text-text-primary">What money do you usually receive?</h1>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-text-secondary">
                Select everything that applies — this just helps us tailor your dashboard.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {INCOME_SOURCE_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    selected={incomeSources.includes(option.value)}
                    onToggle={() => setIncomeSources((prev) => toggleValue(prev, option.value))}
                  />
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Income amount (optional)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Frequency</span>
                  <div className="flex gap-2">
                    {INCOME_FREQUENCY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setIncomeFrequency(option.value)}
                        className={cn(
                          'flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors duration-150',
                          incomeFrequency === option.value
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-primary-accent dark:bg-primary-accent/10 dark:text-primary-accent'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-border dark:text-text-muted dark:hover:border-white/20',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => void handleSkip()} disabled={isSaving}>
                  Skip for now
                </Button>
                <Button
                  onClick={() => void goToStep(3, { incomeSources, incomeFrequency: incomeFrequency || undefined })}
                  isLoading={isSaving}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in-up">
              <h1 className="text-xl font-bold text-gray-900 dark:text-text-primary">What do you usually spend money on?</h1>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-text-secondary">
                Pick your usual categories — we&apos;ll put these front and center for you.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SPENDING_CATEGORY_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    selected={spendingCategories.includes(option.value)}
                    onToggle={() => setSpendingCategories((prev) => toggleValue(prev, option.value))}
                  />
                ))}
              </div>

              {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => void handleSkip()} disabled={isSaving}>
                  Skip for now
                </Button>
                <Button onClick={() => void goToStep(4, { spendingCategories })} isLoading={isSaving}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in-up">
              <h1 className="text-xl font-bold text-gray-900 dark:text-text-primary">
                What would you like Campus Coin to help you with?
              </h1>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-text-secondary">
                Pick as many as apply — these shape the tips you&apos;ll see later.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {FINANCIAL_GOAL_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    selected={goals.includes(option.value)}
                    onToggle={() => setGoals((prev) => toggleValue(prev, option.value))}
                  />
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Monthly spending budget (optional)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                />
                <Input
                  label="Savings target (optional)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={savingsTarget}
                  onChange={(e) => setSavingsTarget(e.target.value)}
                />
              </div>

              {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => void handleSkip()} disabled={isSaving}>
                  Skip for now
                </Button>
                <Button onClick={() => void handleFinishGoals()} isLoading={isSaving}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in-up text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                <PartyPopper className="h-7 w-7" />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-text-primary">You&apos;re all set.</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-text-secondary">
                Your Campus Coin account is ready. Start tracking your money and we&apos;ll help you
                understand your spending.
              </p>
              <div className="mt-6 flex justify-center gap-6 text-xs text-gray-400 dark:text-text-muted">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-500 dark:text-primary-accent" />
                  Profile saved
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500 dark:text-primary-accent" />
                  Insights ready
                </span>
              </div>
              <Button className="mt-8 w-full sm:w-auto" onClick={() => navigate(STUDENT_ROUTES.dashboard)}>
                <Wallet className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
