import { Link } from 'react-router-dom';
import { EyeOff, Lightbulb, ListChecks, Sparkles, Wallet } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';

const values = [
  {
    icon: Wallet,
    title: 'Built for irregular money',
    description:
      'Allowance, gig work, scholarships, the occasional gift — Campus Coin treats every income source as normal, not an edge case.',
    badgeClassName: 'bg-[#d7f0d1] text-[#1c8f53] dark:bg-white/10 dark:text-[var(--primary-accent)]',
  },
  {
    icon: EyeOff,
    title: 'Private by design',
    description:
      "No bank account to link, no financial history to hand over. Everything is entered by you, or imported from a CSV you control.",
    badgeClassName: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
  },
  {
    icon: Lightbulb,
    title: 'Plain-language guidance',
    description:
      'Saving tips are written the way a friend would say them — no jargon, no spreadsheets, just what changed and what to try next.',
    badgeClassName: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
  },
  {
    icon: Sparkles,
    title: 'AI as a suggestion, not a verdict',
    description:
      'Auto-categorization and monthly insights are optional and always editable. You review it, you decide — never the other way around.',
    badgeClassName: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400',
  },
];

const steps = [
  {
    step: '01',
    title: 'Log it in seconds',
    description: 'Quick-add income or expenses with categories that actually match student life.',
  },
  {
    step: '02',
    title: 'See where it goes',
    description: 'A dashboard and monthly reports break spending down by category, automatically.',
  },
  {
    step: '03',
    title: 'Get better at it',
    description: 'Saving tips and budget alerts are generated from your own habits, not a generic template.',
  },
];

export function AboutPage() {
  return (
    <div>
      <section className="mx-auto max-w-[1280px] px-4 pb-4 pt-10 sm:px-6 lg:pt-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1a8f57] dark:text-[var(--primary-accent)]">About Campus Coin</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-[#1d3d2d] dark:text-text-primary sm:text-5xl">
          Budgeting software built for how students actually spend money
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-text-secondary sm:text-lg">
          Most finance apps assume a fixed monthly paycheck and a linked bank account. Campus Coin
          doesn&apos;t. It&apos;s built around the reality of student income and spending — canteen
          food, hostel rent, textbooks, transport, and the occasional night out — so tracking it
          takes seconds, not a finance degree.
        </p>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="grid gap-10 rounded-[28px] bg-white p-8 shadow-sm dark:bg-surface-elevated dark:shadow-black/20 sm:p-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary">Why we built this</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">
              College and university students receive money from multiple, irregular sources —
              allowance from family, part-time or gig income, scholarships, occasional gifts — and
              rarely track where it actually goes. Generic personal-finance apps are built for
              salaried adults with fixed pay cycles and bank integrations; they&apos;re often too
              complex, subscription-gated, or simply irrelevant to a student&apos;s spending
              patterns.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary">What Campus Coin does instead</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">
              It makes logging income and expenses effortless, shows spending by category without
              any setup, and turns your own transaction history into saving tips you can actually
              use — with optional AI help to categorize expenses and summarize the month in plain
              language, always reviewable before it&apos;s final.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary">What you get</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, description, badgeClassName }) => (
            <div
              key={title}
              className="group rounded-[26px] bg-[#f6f4ee] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#f2efe9] hover:shadow-md dark:bg-surface-elevated dark:hover:bg-white/[0.04] dark:hover:shadow-black/30"
            >
              <span
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${badgeClassName}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-[#1d3d2d] dark:text-text-primary">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="rounded-[28px] bg-[#122a1f] px-6 py-12 text-white dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:px-12">
          <div className="flex items-center gap-2 text-[#4ade80] dark:text-[var(--primary-accent)]">
            <ListChecks className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">How it works</span>
          </div>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {steps.map(({ step, title, description }) => (
              <div key={step} className="transition-transform duration-300 hover:-translate-y-1">
                <span className="text-3xl font-bold text-white/20">{step}</span>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-[#d7f0d1] px-6 py-10 text-center dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:py-12">
          <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary sm:text-3xl">Ready to see where your money goes?</h2>
          <p className="max-w-md text-sm text-[#1d3d2d]/70 dark:text-text-secondary">
            Free to use, no bank account required, and you&apos;re in control of every entry.
          </p>
          <Link
            to={PUBLIC_ROUTES.register}
            className="mt-2 rounded-xl bg-[#1c8f53] px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#177e48] hover:shadow-lg hover:shadow-[#1c8f53]/20 active:translate-y-0 dark:bg-[var(--primary)] dark:hover:bg-[var(--primary-accent)]"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
