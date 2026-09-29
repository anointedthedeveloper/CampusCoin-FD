import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Bell, Bot, FileSpreadsheet, LayoutDashboard, Lightbulb, PiggyBank, Receipt, Sparkles, Tags, Users, Wallet, PlayCircle, HelpCircle, LifeBuoy } from 'lucide-react';
import { PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { QuickGuideVideo, Ripple, ScreenshotSlideshow, WatchGuideButton, openQuickGuide } from '@/components/common';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { assets } from '@/assets/images';
import { useRipple } from '@/hooks/useRipple';
import { cn } from '@/utils/cn';

const stats = [
  { value: '100%', label: 'Free to use' },
  { value: '0', label: 'Bank links required' },
  { value: '7+', label: 'Expense categories' },
  { value: 'CSV', label: 'Transaction import' },
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
  const slides = [assets.heroBackground, assets.heroSlideOne, assets.heroSlideThree];
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  return (
    <div
      className="absolute inset-0 z-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <img
          key={slide}
          src={slide}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out dark:brightness-[0.55] dark:saturate-[0.9]',
            index === 2
              ? 'object-[82%_center] sm:object-[82%_center] lg:object-[82%_center]'
              : 'object-[62%_center] sm:object-[26%_center] lg:object-[62%_center]',
            index === active ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-gradient-to-b from-white/30 to-transparent dark:hidden"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 hidden bg-gradient-to-b from-background/90 via-background/70 to-background/40 dark:block lg:bg-gradient-to-r lg:from-background/85 lg:via-background/25 lg:to-transparent"
      />
      <div className="absolute bottom-6 right-5 z-20 flex items-center gap-2 rounded-full bg-black/10 px-3 py-2 backdrop-blur-sm dark:bg-black/20">
        {slides.map((slide, index) => (
          <button
            key={slide}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Show hero slide ${index + 1}`}
            aria-current={index === active}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              index === active ? 'w-7 bg-[#1c8f53] dark:bg-primary-accent' : 'w-2 bg-white/70 hover:bg-white',
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const primaryRipple = useRipple();
  const secondaryRipple = useRipple();

  return (
    <div>
      <QuickGuideVideo />
      {/* ── Hero ── */}
      <section className="relative isolate -mt-24 min-h-svh overflow-hidden bg-[#f6fbf7] pt-24 dark:bg-background">
        <HeroBackground />
        {/* The card sits at the far left so the photo keeps the rest of the screen. */}
        <div className="relative z-20 flex min-h-[calc(100svh-6rem)] w-full items-center px-4 py-6 sm:px-6 md:py-8 lg:pl-[3vw] lg:pr-0 2xl:pl-[5vw]">
          <div className="w-full">
            <div className="glass-panel max-w-[520px] rounded-[28px] p-6 sm:p-8 lg:max-w-[540px] [@media(max-height:720px)]:p-6">
              <span className="inline-flex animate-fade-in-up items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#1d3d2d] shadow-sm transition-transform duration-200 hover:scale-105 dark:bg-white/10 dark:text-text-primary dark:shadow-black/20">
                <span className="text-[#1f7a43] dark:text-primary-accent">Smart money,</span>
                <span className="text-[#1d3d2d] dark:text-text-primary">Brighter Future</span>
              </span>

              <h1 className="mt-4 max-w-[600px] animate-fade-in-up text-[2.3rem] font-bold leading-[1.05] tracking-[-0.04em] text-[#1d3d2d] [animation-delay:100ms] dark:text-text-primary sm:mt-5 sm:text-[3rem] lg:text-[3.25rem] [@media(max-height:720px)]:lg:text-[2.6rem]">
                Take control of <br />
                your money on <br />
                <span className="text-[#1a8f57] dark:text-primary-accent">campus</span>
              </h1>

              <p className="mt-4 max-w-[460px] animate-fade-in-up text-base leading-relaxed text-gray-800 [animation-delay:150ms] dark:text-text-secondary sm:mt-5 sm:text-lg">
                Log allowance, gig income, and scholarships as they land, cap spending per category
                with real-time budget bars, and get AI-assisted saving tips from your own habits —
                no bank account required.
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
                  <p className="text-xs text-gray-600 dark:text-text-muted">Simple tools for everyday campus finances</p>
                </div>
              </div>
              <WatchGuideButton className="mt-5 animate-fade-in-up [animation-delay:300ms]" />
            </div>
          </div>
        </div>
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

      {/* ── Help band ── */}
      <section className="mx-auto mt-12 max-w-[1280px] px-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: PlayCircle, title: 'Watch the 2-minute guide', text: 'See the whole app before you sign up.', onClick: openQuickGuide },
            { icon: HelpCircle, title: 'Read the FAQ', text: 'Quick answers to common questions.', to: PUBLIC_ROUTES.faq },
            { icon: LifeBuoy, title: 'Get help', text: 'Guides, live chat and a contact form.', to: PUBLIC_ROUTES.help },
          ].map(({ icon: Icon, title, text, to, onClick }) => {
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7f0d1] text-[#1c8f53] dark:bg-white/10 dark:text-primary-accent"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-bold text-[#1d3d2d] dark:text-text-primary">{title}</span>
                  <span className="block text-xs text-gray-600 dark:text-text-secondary">{text}</span>
                </span>
              </>
            );
            const cls = 'flex items-center gap-3 rounded-[20px] bg-[#f6f4ee] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:bg-surface-elevated dark:hover:bg-white/[0.04]';
            return to ? <Link key={title} to={to} className={cls}>{body}</Link> : <button key={title} type="button" onClick={onClick} className={cls}>{body}</button>;
          })}
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
