import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  MessageSquare,
  PartyPopper,
  PieChart,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button, FormattedNumberInput, Logo } from '@/components/common';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services';
import { transactionsApi } from '@/api/transactions.api';
import { categoriesApi } from '@/api/categories.api';
import { STUDENT_ROUTES } from '@/constants/routes';
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from '@/constants/config';
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

// ── Step metadata ────────────────────────────────────────────────────
const STEP_LABELS = [
  'Welcome',
  'Income',
  'Spending',
  'Goals',
  'AI Assistant',
];

// ── Progress bar ─────────────────────────────────────────────────────
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full transition-all duration-500',
              i + 1 <= current
                ? 'bg-brand-600 dark:bg-primary-accent'
                : 'bg-gray-200 dark:bg-white/10',
            )}
          />
        ))}
      </div>
      <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-primary/20 dark:text-primary-accent">
        {current} / {total}
      </span>
    </div>
  );
}

// ── Preview card (right panel) ───────────────────────────────────────
function PreviewCard({ initial, title, description, children }: {
  initial: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in-up flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-surface-elevated dark:shadow-black/30">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-brand-600 to-brand-700 px-7 py-5 dark:border-white/5">
        <Logo iconClassName="h-7 w-7" wordmarkClassName="text-base text-white" showTagline={false} />
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
          {initial}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-7">
        <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">{description}</p>
        <div className="mt-5 flex-1">{children}</div>
      </div>
    </div>
  );
}

function PreviewRow({ icon: Icon, label, amount }: { icon?: React.ElementType; label: string; amount?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
      <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 dark:text-text-primary">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-brand-600 dark:text-primary-accent" />}
        {label}
      </span>
      {amount && <span className="text-sm font-bold text-brand-700 dark:text-primary-accent">{amount}</span>}
    </div>
  );
}

function PreviewEmpty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400 dark:border-white/10 dark:text-text-muted">
      {text}
    </p>
  );
}

// ── Skipped step badge ───────────────────────────────────────────────
function SkippedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">
      Skipped
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────
export function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();
  const isEditMode            = searchParams.get('edit') === '1';

  const [step, setStep]                   = useState(1);
  const [isSaving, setIsSaving]           = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletMsgIdx, setWalletMsgIdx]   = useState(0);

  // Track which data steps were skipped (blank) — used for dashboard gate
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  const WALLET_MESSAGES = [
    'Creating your wallet…',
    'Setting up your categories…',
    'Building your budget…',
    'Almost done…',
    'Final touches…',
  ];

  useEffect(() => {
    if (!isCreatingWallet) { setWalletMsgIdx(0); return; }
    const id = setInterval(
      () => setWalletMsgIdx((i) => Math.min(i + 1, WALLET_MESSAGES.length - 1)),
      2500,
    );
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreatingWallet]);

  const [incomeSources,      setIncomeSources]      = useState<string[]>([]);
  const [otherIncomeSource, setOtherIncomeSource] = useState('');
  const [incomeAmount,       setIncomeAmount]        = useState('');
  const [incomeFrequency,    setIncomeFrequency]     = useState<IncomeFrequency | ''>('');
  const [spendingCategories, setSpendingCategories]  = useState<string[]>([]);
  const [otherSpendingCategory, setOtherSpendingCategory] = useState('');
  const [goals,              setGoals]               = useState<string[]>([]);
  const [monthlyBudget,      setMonthlyBudget]       = useState('');
  const [savingsTarget,      setSavingsTarget]       = useState('');
  const [currency,           setCurrency]            = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    if (!user) return;
    const status = user.onboarding?.status ?? 'not_started';
    if (!isEditMode && (status === 'completed' || status === 'skipped')) {
      navigate(STUDENT_ROUTES.dashboard, { replace: true });
      return;
    }
    setIncomeSources(user.onboarding?.incomeSources ?? []);
    setOtherIncomeSource(user.onboarding?.otherIncomeSource ?? '');
    setIncomeFrequency(user.onboarding?.incomeFrequency ?? '');
    setSpendingCategories(user.onboarding?.spendingCategories ?? []);
    setOtherSpendingCategory(user.onboarding?.otherSpendingCategory ?? '');
    setGoals(user.onboarding?.goals ?? []);
    setIncomeAmount(user.monthlyAllowanceBaseline !== undefined ? String(user.monthlyAllowanceBaseline) : '');
    setSavingsTarget(user.savingsGoalAmount !== undefined ? String(user.savingsGoalAmount) : '');
    setCurrency(user.settings?.currency ?? DEFAULT_CURRENCY);
    setStep(isEditMode ? 1 : Math.min(Math.max(user.onboarding?.currentStep ?? 1, 1), TOTAL_ONBOARDING_STEPS + 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const firstName     = user?.fullName?.split(' ')[0] ?? 'there';
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

  async function goToStep(next: number, extra: OnboardingUpdate = {}, stepWasBlank = false) {
    if (stepWasBlank) {
      setSkippedSteps((prev) => new Set(prev).add(step));
    }
    try {
      await persist({ currentStep: next, status: 'in_progress', ...extra });
      setStep(next);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // error already set by persist()
    }
  }

  function goBack() {
    if (step > 1) {
      setStep((s) => s - 1);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Step 2 — income
  function step2IsBlank() {
    return incomeSources.length === 0 && incomeAmount.trim() === '' && incomeFrequency === '';
  }

  // Step 3 — spending
  function step3IsBlank() {
    return spendingCategories.length === 0;
  }

  function toggleIncomeSource(value: string) {
    if (value === 'other' && incomeSources.includes('other')) setOtherIncomeSource('');
    setIncomeSources((previous) => toggleValue(previous, value));
    setError(null);
  }

  function toggleSpendingCategory(value: string) {
    if (value === 'other' && spendingCategories.includes('other')) setOtherSpendingCategory('');
    setSpendingCategories((previous) => toggleValue(previous, value));
    setError(null);
  }

  // Step 4 — goals
  function step4IsBlank() {
    return goals.length === 0 && monthlyBudget.trim() === '' && savingsTarget.trim() === '';
  }

  async function handleFinishGoals() {
    // All three data steps blank → not really completed
    const allBlank = step2IsBlank() && step3IsBlank() && step4IsBlank() && step4IsBlank();
    if (allBlank) {
      setError(
        'You haven\'t filled in anything yet. Please go back and complete at least one step so we can personalise your dashboard.',
      );
      return;
    }

    // Save step 4 data and move to the AI intro step (step 5)
    const stepWasBlank = step4IsBlank();
    if (stepWasBlank) setSkippedSteps((prev) => new Set(prev).add(4));

    try {
      await persist({
        goals,
        monthlyAllowanceBaseline: incomeAmount ? Number(incomeAmount) : undefined,
        savingsGoalAmount:        savingsTarget ? Number(savingsTarget) : undefined,
        monthlyBudget:            monthlyBudget ? Number(monthlyBudget) : undefined,
        currency,
        currentStep: 5,
        status: 'in_progress',
      });
      setStep(5);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // error already set by persist()
    }
  }

  async function handleComplete() {
    setIsCreatingWallet(true);
    const minimumDelay = new Promise<void>((resolve) => setTimeout(resolve, 9000));

    // Determine final status: if ALL three data steps were skipped → incomplete
    const allDataSkipped =
      skippedSteps.has(2) &&
      skippedSteps.has(3) &&
      skippedSteps.has(4) &&
      step2IsBlank() &&
      step3IsBlank() &&
      step4IsBlank();

    const finalStatus = allDataSkipped ? 'in_progress' : 'completed';

    try {
      await Promise.all([
        persist({ currentStep: 6, status: finalStatus }),
        minimumDelay,
      ]);

      // ── Seed an opening income transaction ──────────────────────────
      // monthlyAllowanceBaseline was saved during step 2 (or step 4 if the
      // user went back). We now create a real income transaction for the
      // current month so the dashboard's Income / Balance / Saved stat cards
      // are populated immediately — without this, the dashboard shows $0
      // until the user manually adds a transaction.
      if (finalStatus === 'completed') {
        const baseline = user?.monthlyAllowanceBaseline
          ?? (incomeAmount ? Number(incomeAmount) : 0);

        if (baseline > 0) {
          try {
            // Find the user's income categories and pick the best match
            const categories = await categoriesApi.list();
            const incomeCategories = categories.filter((c) => c.type === 'income');

            // Map the income source the user selected to the best category name
            const sourceToCategory: Record<string, string> = {
              allowance:   'Allowance',
              scholarship: 'Allowance',
              'part-time': 'Salary',
              freelance:   'Freelance',
              gift:        'Gift',
            };

            let targetCategoryName = 'Allowance'; // sensible default for students
            for (const source of incomeSources) {
              if (sourceToCategory[source]) {
                targetCategoryName = sourceToCategory[source];
                break;
              }
            }

            const matched =
              incomeCategories.find((c) => c.name === targetCategoryName) ??
              incomeCategories.find((c) => c.name === 'Allowance') ??
              incomeCategories.find((c) => c.name === 'Other Income') ??
              incomeCategories[0];

            if (matched) {
              // Annualise weekly/occasionally income to a monthly equivalent
              let monthlyAmount = baseline;
              if (incomeFrequency === 'weekly') monthlyAmount = baseline * 4;
              else if (incomeFrequency === 'occasionally') monthlyAmount = baseline;

              await transactionsApi.create({
                categoryId: matched.id,
                type: 'income',
                amount: monthlyAmount,
                description: 'Opening balance (from setup)',
                occurredAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
              });
            }
          } catch {
            // Non-fatal — dashboard will just show $0 until they add a transaction
          }
        }
      }

      setIsCreatingWallet(false);
      if (finalStatus === 'completed') {
        setStep(6); // success screen
      } else {
        // Still incomplete — send to dashboard which will show setup gate
        navigate(STUDENT_ROUTES.dashboard, { replace: true });
      }
    } catch {
      setIsCreatingWallet(false);
    }
  }

  async function handleSkip() {
    try {
      await persist({ currentStep: step, status: 'skipped' });
      navigate(STUDENT_ROUTES.dashboard, { replace: true });
    } catch {
      // error already set by persist()
    }
  }

  if (!user) return null;

  const selectedIncomeOptions   = INCOME_SOURCE_OPTIONS.filter((o) => incomeSources.includes(o.value));
  const selectedCategoryOptions = SPENDING_CATEGORY_OPTIONS.filter((o) => spendingCategories.includes(o.value));
  const selectedGoalOptions     = FINANCIAL_GOAL_OPTIONS.filter((o) => goals.includes(o.value));

  // ── Creating wallet loading screen ──────────────────────────────────
  if (isCreatingWallet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-background">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:border-white/10 dark:bg-surface-elevated">
          <div className="animate-fade-in-up flex flex-col items-center gap-5">
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
              <Wallet className="h-9 w-9 animate-pulse" />
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/25 dark:bg-primary-accent/25" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-text-primary">
                {WALLET_MESSAGES[walletMsgIdx]}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-text-secondary">
                Setting up your budget, categories, and savings tracking. This only takes a moment.
              </p>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {WALLET_MESSAGES.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all duration-300',
                    i <= walletMsgIdx
                      ? 'bg-brand-600 dark:bg-primary-accent'
                      : 'bg-gray-200 dark:bg-white/10',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────
  if (step === 6) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-background">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:border-white/10 dark:bg-surface-elevated">
          <div className="animate-fade-in-up flex flex-col items-center gap-5">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
              <PartyPopper className="h-9 w-9" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-text-primary">
                You&apos;re all set, {firstName}!
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-text-secondary">
                Your Campus Coin account is ready. Start tracking your money and we&apos;ll help you understand your spending.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400 dark:text-text-muted">
              {[
                { icon: CheckCircle2, label: 'Profile saved' },
                { icon: Sparkles,    label: 'Insights ready' },
                { icon: Bot,         label: 'AI Assistant on' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-brand-500 dark:text-primary-accent" />
                  {label}
                </span>
              ))}
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate(STUDENT_ROUTES.dashboard)}
            >
              <Wallet className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main onboarding layout ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50 px-4 pb-16 pt-6 dark:bg-background sm:px-10 lg:px-20 xl:px-28">
      {/* Top bar */}
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => void handleSkip()}
            disabled={isSaving}
            className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-text-muted dark:hover:text-text-secondary"
          >
            Skip setup
          </button>
        </div>

        {/* Progress bar — shown for steps 1–5 */}
        {step <= TOTAL_ONBOARDING_STEPS && (
          <div className="mt-6">
            <StepProgress current={step} total={TOTAL_ONBOARDING_STEPS} />
            <div className="mt-2 flex gap-1.5">
              {STEP_LABELS.slice(0, TOTAL_ONBOARDING_STEPS).map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    'flex-1 text-center text-2xs font-semibold transition-colors duration-200',
                    i + 1 === step
                      ? 'text-brand-600 dark:text-primary-accent'
                      : i + 1 < step
                        ? 'text-gray-500 dark:text-text-muted'
                        : 'text-gray-300 dark:text-white/20',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step content */}
      <div className="mx-auto mt-10 max-w-7xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-stretch">

          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="animate-fade-in-up flex flex-col justify-center">

            {/* Back button — shown from step 2 onwards */}
            {step > 1 && step <= TOTAL_ONBOARDING_STEPS && (
              <button
                type="button"
                onClick={goBack}
                className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-700 dark:text-text-muted dark:hover:text-text-secondary"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}

            {/* ── STEP 1: Welcome ─────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                  <Coins className="h-7 w-7" />
                </span>
                <div>
                  <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-text-primary">
                    Welcome to Campus Coin,<br />{firstName} 👋
                  </h1>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-gray-600 dark:text-text-secondary">
                    Let&apos;s set up your money profile in 4 quick steps so Campus Coin can give you personalised budgeting insights.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { icon: TrendingUp, text: 'Track income & spending' },
                    { icon: PieChart,   text: 'See where money goes' },
                    { icon: Bot,        text: 'AI-powered insights' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1.5 dark:border-primary/20 dark:bg-primary/8">
                      <Icon className="h-3.5 w-3.5 text-brand-600 dark:text-primary-accent" />
                      <span className="text-xs font-medium text-brand-700 dark:text-primary-accent">{text}</span>
                    </div>
                  ))}
                </div>
                <div className="max-w-sm">
                  <label htmlFor="onboarding-currency" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-text-secondary">
                    Preferred currency
                  </label>
                  <select
                    id="onboarding-currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary"
                  >
                    {CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => void goToStep(2, { currency })}
                    isLoading={isSaving}
                  >
                    Let&apos;s go
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Income ─────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-primary-accent">Step 2 of {TOTAL_ONBOARDING_STEPS}</p>
                  <h1 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-text-primary">
                    What money do you usually receive?
                  </h1>
                  <p className="mt-2 text-base text-gray-500 dark:text-text-secondary">
                    Select everything that applies — this helps us tailor your dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {INCOME_SOURCE_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.value}
                      icon={option.icon}
                      label={option.label}
                      selected={incomeSources.includes(option.value)}
                      onToggle={() => toggleIncomeSource(option.value)}
                    />
                  ))}
                </div>

                {incomeSources.includes('other') && (
                  <div className="space-y-1.5">
                    <label htmlFor="other-income-source" className="text-sm font-medium text-gray-700 dark:text-text-secondary">
                      Name the other income source <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="other-income-source"
                      type="text"
                      value={otherIncomeSource}
                      onChange={(event) => { setOtherIncomeSource(event.target.value); setError(null); }}
                      maxLength={60}
                      required
                      aria-invalid={Boolean(error && !otherIncomeSource.trim())}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-surface dark:text-text-primary"
                      placeholder="e.g. Freelance design"
                    />
                    {!otherIncomeSource.trim() && <p className="text-xs text-gray-500 dark:text-text-muted">Enter a name before continuing.</p>}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormattedNumberInput
                    label="Income amount (optional)"
                    placeholder="0.00"
                    value={incomeAmount}
                    onChange={setIncomeAmount}
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Frequency</span>
                    <div className="flex gap-2">
                      {INCOME_FREQUENCY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setIncomeFrequency(opt.value)}
                          className={cn(
                            'flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors duration-150',
                            incomeFrequency === opt.value
                              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-primary-accent dark:bg-primary-accent/10 dark:text-primary-accent'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-white/10 dark:bg-surface dark:text-text-muted dark:hover:border-white/20',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {step2IsBlank() && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    You can leave this blank — but filling it in makes your dashboard more useful.
                  </p>
                )}

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => void goToStep(3, {
                      incomeSources,
                      otherIncomeSource: incomeSources.includes('other') ? otherIncomeSource.trim() : '',
                      incomeFrequency: incomeFrequency || undefined,
                      monthlyAllowanceBaseline: incomeAmount ? Number(incomeAmount) : undefined,
                    }, step2IsBlank())}
                    disabled={incomeSources.includes('other') && !otherIncomeSource.trim()}
                    isLoading={isSaving}
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {step2IsBlank() && (
                    <span className="text-sm text-gray-400 dark:text-text-muted">
                      or <button type="button" onClick={() => void goToStep(3, {}, true)} className="font-medium underline underline-offset-2 hover:text-gray-600">skip this step</button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: Spending ───────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-primary-accent">Step 3 of {TOTAL_ONBOARDING_STEPS}</p>
                  <h1 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-text-primary">
                    What do you usually spend money on?
                  </h1>
                  <p className="mt-2 text-base text-gray-500 dark:text-text-secondary">
                    Pick your usual categories — we&apos;ll put these front and center.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SPENDING_CATEGORY_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.value}
                      icon={option.icon}
                      label={option.label}
                      selected={spendingCategories.includes(option.value)}
                      onToggle={() => toggleSpendingCategory(option.value)}
                    />
                  ))}
                </div>

                {spendingCategories.includes('other') && (
                  <div className="space-y-1.5">
                    <label htmlFor="other-spending-category" className="text-sm font-medium text-gray-700 dark:text-text-secondary">
                      Name the other spending category <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="other-spending-category"
                      type="text"
                      value={otherSpendingCategory}
                      onChange={(event) => { setOtherSpendingCategory(event.target.value); setError(null); }}
                      maxLength={60}
                      required
                      aria-invalid={Boolean(error && !otherSpendingCategory.trim())}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-surface dark:text-text-primary"
                      placeholder="e.g. Pet care"
                    />
                    {!otherSpendingCategory.trim() && <p className="text-xs text-gray-500 dark:text-text-muted">Enter a name before continuing.</p>}
                  </div>
                )}

                {step3IsBlank() && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Picking at least one category makes your spending breakdown more accurate.
                  </p>
                )}

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => void goToStep(4, {
                      spendingCategories,
                      otherSpendingCategory: spendingCategories.includes('other') ? otherSpendingCategory.trim() : '',
                    }, step3IsBlank())}
                    disabled={spendingCategories.includes('other') && !otherSpendingCategory.trim()}
                    isLoading={isSaving}
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {step3IsBlank() && (
                    <span className="text-sm text-gray-400 dark:text-text-muted">
                      or <button type="button" onClick={() => void goToStep(4, {}, true)} className="font-medium underline underline-offset-2 hover:text-gray-600">skip this step</button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 4: Goals ──────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-primary-accent">Step 4 of {TOTAL_ONBOARDING_STEPS}</p>
                  <h1 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-text-primary">
                    What would you like Campus Coin to help with?
                  </h1>
                  <p className="mt-2 text-base text-gray-500 dark:text-text-secondary">
                    Pick as many as apply — these shape the tips you&apos;ll see.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormattedNumberInput
                    label="Monthly spending budget (optional)"
                    placeholder="0.00"
                    value={monthlyBudget}
                    onChange={setMonthlyBudget}
                    hint="We'll track this against your actual spending."
                  />
                  <FormattedNumberInput
                    label="Savings target (optional)"
                    placeholder="0.00"
                    value={savingsTarget}
                    onChange={setSavingsTarget}
                    hint="Shown as a progress bar on your dashboard."
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => void handleFinishGoals()}
                    isLoading={isSaving}
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {step4IsBlank() && (
                    <span className="text-sm text-gray-400 dark:text-text-muted">
                      or <button type="button" onClick={() => void goToStep(5, {}, true)} className="font-medium underline underline-offset-2 hover:text-gray-600">skip this step</button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 5: AI Assistant intro ─────────────────────── */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-primary-accent">Step 5 of {TOTAL_ONBOARDING_STEPS}</p>
                  <h1 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-text-primary">
                    Meet your AI Assistant
                  </h1>
                  <p className="mt-2 text-base text-gray-500 dark:text-text-secondary">
                    Campus Coin has a built-in AI assistant that understands your spending and answers questions in plain language.
                  </p>
                </div>

                {/* Feature highlights */}
                <div className="space-y-3">
                  {[
                    {
                      icon: MessageSquare,
                      title: 'Ask anything about your money',
                      desc: '"How much did I spend on food this month?" — it knows.',
                      color: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
                    },
                    {
                      icon: Zap,
                      title: 'Log expenses by describing them',
                      desc: 'Say "Bought lunch for ₦2,500" and it\'ll suggest a category and offer to log it.',
                      color: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
                    },
                    {
                      icon: Sparkles,
                      title: 'Personalised saving tips',
                      desc: 'Based on your actual spending patterns, not generic advice.',
                      color: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400',
                    },
                    {
                      icon: TrendingUp,
                      title: 'Monthly insights, automatically',
                      desc: 'Get a summary of how your month went without lifting a finger.',
                      color: 'bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent',
                    },
                  ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-surface-elevated">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{title}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-text-secondary">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skipped steps summary */}
                {skippedSteps.size > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-400/15 dark:bg-amber-400/8">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      You skipped {skippedSteps.size} step{skippedSteps.size > 1 ? 's' : ''} — your dashboard will still work, but you can always go back and fill them in from your profile settings.
                    </p>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => void handleComplete()}
                  isLoading={isSaving}
                >
                  <Wallet className="h-4 w-4" />
                  Finish setup
                </Button>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: live preview ────────────────────────── */}
          <div className="hidden lg:block">
            {step === 1 && (
              <PreviewCard initial={avatarInitial} title="Your money, all in one place" description="A clear view of your student finances at a glance.">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Balance', value: 0 },
                    { label: 'Income',  value: 0 },
                    { label: 'Expense', value: 0 },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                      <p className="text-sm font-bold text-gray-900 dark:text-text-primary">
                        {formatCurrency(tile.value, currency)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-text-muted">{tile.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-8 rounded-xl bg-gray-100 dark:bg-white/5" />
                  <div className="h-8 w-4/5 rounded-xl bg-gray-100 dark:bg-white/5" />
                  <div className="h-8 w-3/5 rounded-xl bg-gray-100 dark:bg-white/5" />
                </div>
              </PreviewCard>
            )}

            {step === 2 && (
              <PreviewCard initial={avatarInitial} title="Track your income" description="Record allowances, scholarships and side-hustle income.">
                {incomeAmount && (
                  <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-white/5 dark:bg-white/5">
                    <p className="text-xs font-medium text-gray-500 dark:text-text-muted">
                      {incomeFrequency
                        ? `Income · ${INCOME_FREQUENCY_OPTIONS.find((o) => o.value === incomeFrequency)?.label}`
                        : 'Income'}
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-brand-900 dark:text-text-primary">
                      {formatCurrency(Number(incomeAmount), currency)}
                    </p>
                  </div>
                )}
                {selectedIncomeOptions.length === 0 ? (
                  <PreviewEmpty text="Pick an income source to see it here." />
                ) : (
                  <div className="space-y-2">
                    {selectedIncomeOptions.map((opt) => (
                      <PreviewRow key={opt.value} icon={opt.icon} label={opt.value === 'other' ? otherIncomeSource || opt.label : opt.label} />
                    ))}
                  </div>
                )}
                {step2IsBlank() && <div className="mt-3"><SkippedBadge /></div>}
              </PreviewCard>
            )}

            {step === 3 && (
              <PreviewCard initial={avatarInitial} title="Keep expenses under control" description="Every category you pick gets set up and ready to use.">
                {selectedCategoryOptions.length === 0 ? (
                  <PreviewEmpty text="Pick a category to see it here." />
                ) : (
                  <div className="space-y-2">
                    {selectedCategoryOptions.map((opt) => (
                      <PreviewRow key={opt.value} icon={opt.icon} label={opt.value === 'other' ? otherSpendingCategory || opt.label : opt.label} />
                    ))}
                  </div>
                )}
                {step3IsBlank() && <div className="mt-3"><SkippedBadge /></div>}
              </PreviewCard>
            )}

            {step === 4 && (
              <PreviewCard initial={avatarInitial} title="Build a budget that works" description="Set limits for the things you spend on most.">
                {monthlyBudget && (
                  <div className="mb-4 rounded-xl bg-brand-50 p-4 dark:bg-white/5">
                    <p className="text-xs text-gray-500 dark:text-text-muted">Monthly budget</p>
                    <p className="mt-0.5 text-xl font-bold text-brand-900 dark:text-text-primary">
                      {formatCurrency(Number(monthlyBudget), currency)}
                    </p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white dark:bg-white/10">
                      <div className="h-full w-0 rounded-full bg-brand-500 dark:bg-primary-accent" />
                    </div>
                  </div>
                )}
                {selectedGoalOptions.length === 0 ? (
                  <PreviewEmpty text="Pick a goal to see it here." />
                ) : (
                  <div className="space-y-2">
                    {selectedGoalOptions.map((opt) => (
                      <PreviewRow key={opt.value} icon={opt.icon} label={opt.label} />
                    ))}
                  </div>
                )}
                {step4IsBlank() && <div className="mt-3"><SkippedBadge /></div>}
              </PreviewCard>
            )}

            {step === 5 && (
              <PreviewCard initial={avatarInitial} title="Campus Coin Assistant" description="Ask about your spending, describe purchases, get insights.">
                {/* Mock chat UI */}
                <div className="flex flex-col gap-3">
                  <div className="self-start max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 dark:border-white/[0.06] dark:bg-surface dark:text-text-secondary">
                    Hi! I&apos;m your Campus Coin Assistant. What would you like to know?
                  </div>
                  <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white dark:bg-primary">
                    How much did I spend on food this month?
                  </div>
                  <div className="self-start max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 dark:border-white/[0.06] dark:bg-surface dark:text-text-secondary">
                    You&apos;ve spent ₦8,400 on Food & Drinks this month — that&apos;s 34% of your total expenses.
                  </div>
                  <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white dark:bg-primary">
                    Bought suya — ₦1,200
                  </div>
                  <div className="self-start max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 dark:border-white/[0.06] dark:bg-surface dark:text-text-secondary">
                    Got it — ₦1,200 in Food & Drinks. Want me to log it?
                  </div>
                </div>
              </PreviewCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
