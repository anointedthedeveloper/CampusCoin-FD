import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  FileSpreadsheet,
  LayoutDashboard,
  Lightbulb,
  PiggyBank,
  Receipt,
  Sparkles,
  Tags,
  Users,
  Wallet,
} from 'lucide-react';
import { PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { Ripple, ScreenshotSlideshow } from '@/components/common';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { assets } from '@/assets/images';
import { useTheme } from '@/hooks/useTheme';
import { useRipple } from '@/hooks/useRipple';
import { cn } from '@/utils/cn';

const stats = [
  { value: '100%', label: 'Free to use' },
  { value: '0', label: 'Bank links required' },
  { value: '7+', label: 'Expense categories' },
  { value: '6mo', label: 'Trend history' },
];

const steps = [
  {
    step: '01',
    title: 'Create your account',
    description: 'Sign up in seconds — just your name, email, and a password. No bank details, no credit card.',
  },
  {
    step: '02',
    title: 'Log income & expenses',
    description: 'Quick-add transactions with student-relevant categories like Food, Transport, Hostel, and Allowance.',
  },
  {
    step: '03',
    title: 'Set monthly budgets',
    description: 'Cap spending per category and watch live progress bars update the moment you log a transaction.',
  },
  {
    step: '04',
    title: 'Review & improve',
    description: 'Monthly reports, a spending heatmap, and personalized saving tips help you spend smarter each month.',
  },
];

// Sitemap data — required by SRS to appear on the home page
const sitemapSections = [
  {
    title: 'Public Pages',
    links: [
      { label: 'Home', to: PUBLIC_ROUTES.home },
      { label: 'How it works', to: PUBLIC_ROUTES.features },
      { label: "What it's about", to: PUBLIC_ROUTES.about },
      { label: 'FAQ & Help', to: PUBLIC_ROUTES.faq },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', to: PUBLIC_ROUTES.login },
      { label: 'Create account', to: PUBLIC_ROUTES.register },
      { label: 'Forgot password', to: PUBLIC_ROUTES.forgotPassword },
    ],
  },
  {
    title: 'App — Track',
    links: [
      { label: 'Dashboard', to: STUDENT_ROUTES.dashboard },
      { label: 'Transactions', to: STUDENT_ROUTES.transactions },
      { label: 'Add Income', to: `${STUDENT_ROUTES.newTransaction}?type=income` },
      { label: 'Add Expense', to: `${STUDENT_ROUTES.newTransaction}?type=expense` },
      { label: 'Import CSV', to: STUDENT_ROUTES.import },
    ],
  },
  {
    title: 'App — Plan & Review',
    links: [
      { label: 'Budgets', to: STUDENT_ROUTES.budgets },
      { label: 'Reports', to: STUDENT_ROUTES.reports },
      { label: 'Saving Tips', to: STUDENT_ROUTES.savingTips },
      { label: 'AI Assistant', to: STUDENT_ROUTES.insights },
      { label: 'Bookmarks', to: STUDENT_ROUTES.bookmarks },
    ],
  },
  {
    title: 'App — Account',
    links: [
      { label: 'Profile', to: STUDENT_ROUTES.profile },
      { label: 'Categories', to: STUDENT_ROUTES.categories },
      { label: 'Notifications', to: STUDENT_ROUTES.notifications },
    ],
  },
];

const appFeatureHighlights = [
  { icon: LayoutDashboard, label: 'Dashboard', description: 'Balance, top category, budget vs actual at a glance.' },
  { icon: Receipt, label: 'Transactions', description: 'Full history with search, filter, and delete.' },
  { icon: Wallet, label: 'Budgets', description: 'Per-category monthly limits with live progress bars.' },
  { icon: BarChart3, label: 'Reports', description: '6-month trend, heatmap, weekly breakdown, CSV export.' },
  { icon: Lightbulb, label: 'Saving Tips', description: 'Personalized tips from your own spending habits.' },
  { icon: Bot, label: 'AI Assistant', description: 'Chat-based help for budgets, spending, and logging.' },
  { icon: Tags, label: 'Categories', description: 'Custom income and expense categories you control.' },
  { icon: FileSpreadsheet, label: 'CSV Import', description: 'Bring in months of history from any spreadsheet.' },
  { icon: Bell, label: 'Notifications', description: 'Budget alerts and system announcements in one place.' },
  { icon: PiggyBank, label: 'Savings Goal', description: 'Set a target and track progress on your dashboard.' },
];

function HeroBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      <img
        src={assets.heroBackground}
        alt=""
        aria-hidden="true"
        className={cn(
          'absolute inset-0 z-0 h-full w-full object-cover object-[36%_center] transition-opacity duration-500 sm:object-[48%_center] md:object-[68%_center]',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
      />
      <img
        src={assets.heroBackgroundDark}
        alt=""
        aria-hidden="true"
        className={cn(
          'absolute inset-0 z-0 h-full w-full object-cover object-[36%_center] transition-opacity duration-500 sm:object-[48%_center] md:object-[68%_center]',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-gradient-to-b from-white/90 via-white/65 to-white/15 opacity-100 transition-opacity duration-500 dark:opacity-0 md:bg-gradient-to-r md:from-white/70 md:via-white/20 md:to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-gradient-to-b from-background/85 via-background/30 to-transparent opacity-0 transition-opacity duration-500 dark:opacity-100 md:bg-gradient-to-r md:from-background/75 md:via-background/10 md:to-transparent"
      />
    </>
  );
}

export function HomePage() {
  const primaryRipple = useRipple();
  const secondaryRipple = useRipple();

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative isolate -mt-24 min-h-svh overflow-hidden bg-[#f6fbf7] pt-24 dark:bg-background">
        <HeroBackground />
        <div className="relative z-20 mx-auto flex min-h-[calc(100svh-6rem)] max-w-[1280px] items-center px-4 py-6 sm:px-6 md:py-8">
          <div className="grid w-full items-center gap-6 md:grid-cols-[1.05fr_1fr] md:gap-10">
            <div className="max-w-[600px] py-3 md:py-6">
              <span className="inline-flex animate-fade-in-up items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#1d3d2d] shadow-sm transition-transform duration-200 hover:scale-105 dark:bg-white/10 dark:text-text-primary dark:shadow-black/20">
                <span className="text-[#1f7a43] dark:text-primary-accent">Smart money,</span>
                <span className="text-[#1d3d2d] dark:text-text-primary">Brighter Future</span>
              </span>

              <h1 className="mt-4 max-w-[560px] animate-fade-in-up text-[2.8rem] font-bold leading-[0.95] tracking-[-0.06em] text-[#1d3d2d] [animation-delay:100ms] dark:text-text-primary sm:mt-5 sm:text-[4.2rem] lg:text-[5.2rem]">
                Take control of <br />
                your money on <br />
                <span className="text-[#1a8f57] dark:text-primary-accent">campus</span>
              </h1>

              <p className="mt-4 max-w-[440px] animate-fade-in-up text-base leading-relaxed text-gray-700 [animation-delay:150ms] dark:text-text-secondary sm:mt-5 sm:text-lg">
                Campus Coin makes it easy to track spending, stick to a budget, and understand where
                your money goes — all in one place built for students.
              </p>

              <div className="mt-5 flex animate-fade-in-up flex-wrap gap-3 [animation-delay:200ms] sm:mt-8 sm:gap-4">
                <Link
                  to={PUBLIC_ROUTES.register}
                  onPointerDown={primaryRipple.onPointerDown}
                  className="group relative isolate inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#1c8f53] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#177e48] hover:shadow-lg hover:shadow-[#1c8f53]/20 active:translate-y-0 active:scale-[0.98] dark:bg-primary dark:hover:bg-primary-accent dark:hover:shadow-primary-accent/20 sm:px-7 sm:py-4 sm:text-base"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <Ripple ripples={primaryRipple.ripples} className="bg-white/35" />
                </Link>
                <Link
                  to={PUBLIC_ROUTES.features}
                  onPointerDown={secondaryRipple.onPointerDown}
                  className="relative isolate overflow-hidden rounded-xl bg-white/90 px-5 py-3 text-sm font-semibold text-[#1d3d2d] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:bg-white/10 dark:text-text-primary dark:shadow-black/20 dark:hover:bg-white/15 sm:px-7 sm:py-4 sm:text-base"
                >
                  See How It Works
                  <Ripple ripples={secondaryRipple.ripples} className="bg-[#1c8f53]/15 dark:bg-white/20" />
                </Link>
              </div>

              <div className="group mt-5 flex animate-fade-in-up items-center gap-3 [animation-delay:250ms] sm:mt-8">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7f0d1] text-[#1c8f53] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 dark:bg-white/10 dark:text-primary-accent">
                  <Users className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1d3d2d] dark:text-text-primary">Built for students</p>
                  <p className="text-xs text-gray-500 dark:text-text-muted">Simple tools for everyday campus finances</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <img
          src={assets.heroPhone}
          alt="Campus Coin mobile app showing a student balance and transactions"
          className="pointer-events-none absolute bottom-[7%] right-[4%] z-20 w-[112px] animate-hero-phone-bob object-contain drop-shadow-xl sm:right-[8%] sm:w-[150px] md:bottom-[8%] md:right-[24%] md:w-[clamp(200px,22vw,300px)]"
        />
      </section>

      {/* ── Feature cards ── */}
      <section className="mx-auto mt-6 max-w-[1280px] px-4 sm:px-6">
        <FeatureGrid />
      </section>

      {/* ── Stats strip ── */}
      <section className="mx-auto mt-14 max-w-[1280px] px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-[28px] bg-[#122a1f] px-6 py-8 dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold text-white sm:text-4xl">{value}</p>
              <p className="mt-1 text-sm text-white/50 dark:text-text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto mt-12 max-w-[1280px] px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#1a8f57] dark:text-primary-accent">How it works</p>
          <h2 className="mt-2 text-2xl font-bold text-[#1d3d2d] dark:text-text-primary sm:text-3xl">
            Up and running in four steps
          </h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ step, title, description }) => (
            <div
              key={step}
              className="group rounded-[26px] bg-[#f6f4ee] p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg dark:bg-surface-elevated dark:hover:bg-white/[0.04] dark:hover:shadow-black/30"
            >
              <span className="text-3xl font-bold text-[#1c8f53]/20 group-hover:text-[#1c8f53]/40 dark:text-primary-accent/25 dark:group-hover:text-primary-accent/50">{step}</span>
              <h3 className="mt-3 font-semibold text-[#1d3d2d] dark:text-text-primary">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Screenshot slideshow ── */}
      <section className="mx-auto mt-12 max-w-[1280px]">
        <div className="text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-[#1a8f57] dark:text-primary-accent">
            <Sparkles className="h-3.5 w-3.5" />
            See it in action
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#1d3d2d] dark:text-text-primary sm:text-3xl">
            A real look at the app
          </h2>
        </div>
        <div className="mt-6">
          <ScreenshotSlideshow />
        </div>
      </section>

      {/* ── App feature highlights ── */}
      <section className="mx-auto mt-12 max-w-[1280px] px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#1a8f57] dark:text-primary-accent">Everything included</p>
          <h2 className="mt-2 text-2xl font-bold text-[#1d3d2d] dark:text-text-primary sm:text-3xl">
            10 features, zero cost
          </h2>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {appFeatureHighlights.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="group flex flex-col gap-2 rounded-[20px] bg-[#f6f4ee] p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md dark:bg-surface-elevated dark:hover:bg-white/[0.04] dark:hover:shadow-black/30"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d7f0d1] text-[#1c8f53] transition-transform duration-300 group-hover:scale-110 dark:bg-white/10 dark:text-primary-accent">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-[#1d3d2d] dark:text-text-primary">{label}</p>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto mt-12 max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-[#d7f0d1] px-6 py-10 text-center dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:py-12">
          <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary sm:text-3xl">Ready to see where your money goes?</h2>
          <p className="max-w-md text-sm text-[#1d3d2d]/70 dark:text-text-secondary">
            Free to use, no bank account required, and you&apos;re in control of every entry.
          </p>
          <Link
            to={PUBLIC_ROUTES.register}
            className="mt-2 rounded-xl bg-[#1c8f53] px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#177e48] hover:shadow-lg hover:shadow-[#1c8f53]/20 active:translate-y-0 dark:bg-primary dark:hover:bg-primary-accent"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── Sitemap (required by SRS) ── */}
      <section className="mx-auto mt-12 max-w-[1280px] px-4 pb-16 sm:px-6" aria-label="Site map">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-border dark:bg-surface-elevated sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted">Site Map</p>
          <h2 className="mt-1 text-lg font-bold text-[#1d3d2d] dark:text-text-primary">Everything in Campus Coin</h2>
          <div className="mt-6 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {sitemapSections.map(({ title, links }) => (
              <div key={title}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted">{title}</h3>
                <ul className="mt-3 space-y-2">
                  {links.map(({ label, to }) => (
                    <li key={label}>
                      <Link
                        to={to}
                        className="text-sm text-gray-600 transition-colors duration-200 hover:text-[#1c8f53] dark:text-text-secondary dark:hover:text-primary-accent"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
