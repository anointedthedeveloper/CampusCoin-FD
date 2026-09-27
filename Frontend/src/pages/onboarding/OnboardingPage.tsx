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
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services';
import { STUDENT_ROUTES } from '@/constants/routes';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency } from '@/utils/format';
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

// The right-hand "live preview" card. Mirrors the split-panel layout from the
// product's Figma onboarding flow (logo + step counter up top, a floating
// preview card on the right showing what the step is about) — but instead of
// a static mockup screenshot, it reflects whatever the user has actually
// picked so far, so it reads as a real preview rather than marketing art.
function PreviewCard({ initial, title, description, children }: {
  initial: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in-up flex h-full min-h-[560px] flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-brand-900/5 dark:border-white/10 dark:bg-surface-elevated dark:shadow-black/30">
      <div className="flex items-center justify-between bg-brand-50 px-7 py-5 dark:bg-white/5">
        <Logo iconClassName="h-7 w-7" wordmarkClassName="text-base" showTagline={false} />
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-primary-accent/20 dark:text-primary-accent">
          {initial}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-8">
        <h2 className="text-xl font-bold text-brand-900 dark:text-text-primary">{title}</h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-text-secondary">{description}</p>
        <div className="mt-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

function PreviewRow({ icon: Icon, label, amount }: { icon?: React.ElementType; label: string; amount?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-5 py-4 dark:bg-white/5">
      <span className="flex items-center gap-3 text-sm font-medium text-brand-900 dark:text-text-primary">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-brand-600 dark:text-primary-accent" />}
        {label}
      </span>
      {amount && <span className="text-sm font-semibold text-brand-700 dark:text-primary-accent">{amount}</span>}
    </div>
  );
}

function PreviewEmpty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-white/10 dark:text-text-muted">{text}</p>;
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
  const avatarInitial = firstName.charAt(0).toUpperCase() || 'C';

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
          monthlyBudget: monthlyBudget ? Number(monthlyBudget) : undefined,
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

  const selectedIncomeOptions = INCOME_SOURCE_OPTIONS.filter((o) => incomeSources.includes(o.value));
  const selectedCategoryOptions = SPENDING_CATEGORY_OPTIONS.filter((o) => spendingCategories.includes(o.value));
  const selectedGoalOptions = FINANCIAL_GOAL_OPTIONS.filter((o) => goals.includes(o.value));

  return (
    <div className="min-h-screen bg-brand-50 px-4 py-8 dark:bg-background sm:px-10 lg:px-20 xl:px-28">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        {step <= TOTAL_ONBOARDING_STEPS && !isCreatingWallet && (
          <span className="text-sm font-semibold text-gray-400 dark:text-text-muted">
            {step} / {TOTAL_ONBOARDING_STEPS}
          </span>
        )}
      </div>

      <div className="mx-auto mt-12 max-w-7xl pb-10">
        {isCreatingWallet ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-lg shadow-brand-900/5 dark:border-white/10 dark:bg-surface-elevated dark:shadow-black/40">
            <div className="animate-fade-in-up flex flex-col items-center">
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                <Wallet className="h-7 w-7 animate-pulse" />
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/30 dark:bg-primary-accent/30" />
              </span>
              <h1 className="mt-5 text-xl font-bold text-brand-900 dark:text-text-primary">Creating your wallet…</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-text-secondary">
                Setting up your budget, categories, and savings tracking. This only takes a moment.
              </p>
            </div>
          </div>
        ) : step === 5 ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-lg shadow-brand-900/5 dark:border-white/10 dark:bg-surface-elevated dark:shadow-black/40">
            <div className="animate-fade-in-up">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                <PartyPopper className="h-7 w-7" />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-brand-900 dark:text-text-primary">You&apos;re all set.</h1>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-stretch">
            {/* Left column — the actual step content */}
            <div className="animate-fade-in-up flex flex-col justify-center">
              {step === 1 && (
                <div>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                    <Coins className="h-6 w-6" />
                  </span>
                  <h1 className="mt-5 text-4xl font-extrabold leading-tight text-brand-900 dark:text-text-primary">
                    Welcome to Campus Coin, {firstName}
                  </h1>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-gray-600 dark:text-text-secondary">
                    Let&apos;s set up your money profile so Campus Coin can give you more useful budgeting
                    insights.
                  </p>
                  <div className="mt-8 flex items-center gap-5">
                    <Button onClick={() => void goToStep(2)} isLoading={isSaving}>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <button type="button" onClick={() => void handleSkip()} disabled={isSaving} className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-text-muted dark:hover:text-text-secondary">
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h1 className="text-4xl font-extrabold text-brand-900 dark:text-text-primary">What money do you usually receive?</h1>
                  <p className="mt-2 text-base text-gray-600 dark:text-text-secondary">
                    Select everything that applies — this just helps us tailor your dashboard.
                  </p>

                  <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
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

                  <div className="mt-8 flex items-center gap-5">
                    <Button onClick={() => void goToStep(3, { incomeSources, incomeFrequency: incomeFrequency || undefined })} isLoading={isSaving}>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <button type="button" onClick={() => void handleSkip()} disabled={isSaving} className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-text-muted dark:hover:text-text-secondary">
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h1 className="text-4xl font-extrabold text-brand-900 dark:text-text-primary">What do you usually spend money on?</h1>
                  <p className="mt-2 text-base text-gray-600 dark:text-text-secondary">
                    Pick your usual categories — we&apos;ll put these front and center for you.
                  </p>

                  <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
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

                  <div className="mt-8 flex items-center gap-5">
                    <Button onClick={() => void goToStep(4, { spendingCategories })} isLoading={isSaving}>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <button type="button" onClick={() => void handleSkip()} disabled={isSaving} className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-text-muted dark:hover:text-text-secondary">
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h1 className="text-4xl font-extrabold text-brand-900 dark:text-text-primary">
                    What would you like Campus Coin to help you with?
                  </h1>
                  <p className="mt-2 text-base text-gray-600 dark:text-text-secondary">
                    Pick as many as apply — these shape the tips you&apos;ll see later.
                  </p>

                  <div className="mt-7 grid grid-cols-2 gap-4">
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

                  <div className="mt-8 flex items-center gap-5">
                    <Button onClick={() => void handleFinishGoals()} isLoading={isSaving}>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <button type="button" onClick={() => void handleSkip()} disabled={isSaving} className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-text-muted dark:hover:text-text-secondary">
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right column — live preview, echoing the Figma onboarding's
                floating app-mockup panel but reflecting real picks instead of
                static demo numbers. Hidden on small screens — there's no room
                for it alongside the actual form. */}
            <div className="hidden lg:block">
              {step === 1 && (
                <PreviewCard initial={avatarInitial} title="Your money, all in one place" description="Get a clear view of your student finances at a glance.">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Balance', value: 0 },
                      { label: 'Income', value: 0 },
                      { label: 'Expense', value: 0 },
                    ].map((tile) => (
                      <div key={tile.label} className="rounded-xl bg-brand-50 p-3 dark:bg-white/5">
                        <p className="text-sm font-bold text-brand-900 dark:text-text-primary">{formatCurrency(tile.value, DEFAULT_CURRENCY)}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-text-muted">{tile.label}</p>
                      </div>
                    ))}
                  </div>
                </PreviewCard>
              )}

              {step === 2 && (
                <PreviewCard initial={avatarInitial} title="Track your income" description="Record allowances, scholarships and side-hustle income.">
                  {incomeAmount && (
                    <div className="mb-3 rounded-xl bg-brand-50 p-4 dark:bg-white/5">
                      <p className="text-xs text-gray-500 dark:text-text-muted">
                        {incomeFrequency ? `Income · ${INCOME_FREQUENCY_OPTIONS.find((o) => o.value === incomeFrequency)?.label}` : 'Income'}
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-brand-900 dark:text-text-primary">
                        {formatCurrency(Number(incomeAmount), DEFAULT_CURRENCY)}
                      </p>
                    </div>
                  )}
                  {selectedIncomeOptions.length === 0 ? (
                    <PreviewEmpty text="Pick an income source to see it here." />
                  ) : (
                    <div className="space-y-2">
                      {selectedIncomeOptions.map((option) => (
                        <PreviewRow key={option.value} icon={option.icon} label={option.label} />
                      ))}
                    </div>
                  )}
                </PreviewCard>
              )}

              {step === 3 && (
                <PreviewCard initial={avatarInitial} title="Keep expenses under control" description="Every category you pick gets set up and ready to use.">
                  {selectedCategoryOptions.length === 0 ? (
                    <PreviewEmpty text="Pick a category to see it here." />
                  ) : (
                    <div className="space-y-2">
                      {selectedCategoryOptions.map((option) => (
                        <PreviewRow key={option.value} icon={option.icon} label={option.label} />
                      ))}
                    </div>
                  )}
                </PreviewCard>
              )}

              {step === 4 && (
                <PreviewCard initial={avatarInitial} title="Build a budget that works" description="Set limits for the things you spend on most.">
                  {monthlyBudget && (
                    <div className="mb-4 rounded-xl bg-brand-50 p-4 dark:bg-white/5">
                      <p className="text-xs text-gray-500 dark:text-text-muted">Monthly budget</p>
                      <p className="mt-0.5 text-xl font-bold text-brand-900 dark:text-text-primary">{formatCurrency(Number(monthlyBudget), DEFAULT_CURRENCY)}</p>
                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white dark:bg-white/10">
                        <div className="h-full w-0 rounded-full bg-brand-500 dark:bg-primary-accent" />
                      </div>
                    </div>
                  )}
                  {selectedGoalOptions.length === 0 ? (
                    <PreviewEmpty text="Pick a goal to see it here." />
                  ) : (
                    <div className="space-y-2">
                      {selectedGoalOptions.map((option) => (
                        <PreviewRow key={option.value} icon={option.icon} label={option.label} />
                      ))}
                    </div>
                  )}
                </PreviewCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
