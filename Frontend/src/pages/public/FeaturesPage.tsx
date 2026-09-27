import { Link } from 'react-router-dom';
import {
  BellRing,
  FileSpreadsheet,
  Filter,
  Gauge,
  LineChart,
  ListPlus,
  PieChart,
  Repeat,
  Sparkles,
  Tags,
  Target,
  TrendingDown,
} from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { assets } from '@/assets/images';
import { BrowserFrame, DeviceShowcase } from '@/components/common';

const groups = [
  {
    key: 'track',
    eyebrow: 'Track',
    title: 'Log every naira, in seconds',
    description:
      'Quick-add forms for income and expenses, built around how student money actually moves — no bank linking, no waiting for a sync.',
    accent: 'text-[#1c8f53] dark:text-primary-accent',
    chip: 'bg-[#d7f0d1] text-[#1c8f53] dark:bg-white/10 dark:text-primary-accent',
    image: assets.screenshots.dashboard,
    imageAlt: 'Campus Coin dashboard showing stat cards, spending breakdown, and recent transactions',
    reverse: false,
    items: [
      {
        icon: ListPlus,
        title: 'Manual income & expense entry',
        description: 'Add a transaction with amount, category, date, and an optional note in a few taps.',
      },
      {
        icon: Tags,
        title: 'Student-relevant categories',
        description: 'Feeding, hostel, transport, data/airtime, books — pre-built categories that fit campus life, fully editable.',
      },
      {
        icon: FileSpreadsheet,
        title: 'CSV import',
        description: 'Already tracking spend elsewhere? Bring in a CSV instead of retyping months of history.',
      },
    ],
  },
  {
    key: 'plan',
    eyebrow: 'Plan',
    title: 'Set limits that match your term, not a template',
    description:
      'Budgets are set per category and period, with a clear read on how much room is left before you overspend.',
    accent: 'text-blue-600 dark:text-blue-400',
    chip: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
    image: assets.screenshots.budgets,
    imageAlt: 'Campus Coin budgets page showing category limits and progress bars',
    reverse: true,
    items: [
      {
        icon: Target,
        title: 'Category budgets',
        description: 'Cap what you plan to spend on feeding, transport, or fun — weekly, monthly, or per term.',
      },
      {
        icon: Gauge,
        title: 'Live progress bars',
        description: 'See exactly how much of each budget is used at a glance, updated the moment you log a transaction.',
      },
      {
        icon: BellRing,
        title: 'Overspend alerts',
        description: "Get a clear warning when you're close to or past a limit — before it becomes a surprise.",
      },
    ],
  },
  {
    key: 'understand',
    eyebrow: 'Understand',
    title: 'See where it actually went',
    description:
      'A dashboard and monthly reports turn raw transactions into a picture you can act on, with charts that hold up for colorblind readers too.',
    accent: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
    image: assets.screenshots.reports,
    imageAlt: 'Campus Coin reports page showing income vs expense trend and category charts',
    reverse: false,
    items: [
      {
        icon: PieChart,
        title: 'Spending breakdown',
        description: 'A category donut chart shows exactly what took the biggest bite out of this month.',
      },
      {
        icon: LineChart,
        title: 'Income vs. expense trend',
        description: 'Track the gap between what comes in and what goes out, month over month.',
      },
      {
        icon: Filter,
        title: 'Monthly & custom reports',
        description: 'Filter by category, date range, or transaction type to answer a specific question fast.',
      },
    ],
  },
  {
    key: 'grow',
    eyebrow: 'Grow',
    title: 'Get better at it, with help that stays optional',
    description:
      'Saving tips and AI assistance are generated from your own transaction history — always reviewable, never automatic.',
    accent: 'text-purple-600 dark:text-purple-400',
    chip: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400',
    image: assets.screenshots.aiAssistant,
    imageAlt: 'Campus Coin AI assistant page with saving tips and chat',
    reverse: true,
    items: [
      {
        icon: TrendingDown,
        title: 'Personalized saving tips',
        description: 'Plain-language suggestions based on your actual habits — "cut delivery orders by 2/week" not generic advice.',
      },
      {
        icon: Sparkles,
        title: 'AI auto-categorization',
        description: 'Let AI suggest a category for a new transaction. You confirm or change it — it never posts without you.',
      },
      {
        icon: Repeat,
        title: 'Monthly AI summary',
        description: 'A short, plain-language recap of the month — what changed, what to watch — generated on demand.',
      },
    ],
  },
];

export function FeaturesPage() {
  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pb-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:pt-16">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-text-muted">
            Features
            <span className="h-px w-8 bg-gray-300 dark:bg-white/15" />
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-bold leading-[1.08] text-[#1d3d2d] dark:text-text-primary sm:text-5xl lg:text-[3.4rem]">
            Everything you need to manage student money, nothing you don&apos;t.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-gray-600 dark:text-text-secondary">
            Four things Campus Coin actually does — track what moves, plan around it, understand the pattern, and get a little better each month.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              to={PUBLIC_ROUTES.register}
              className="inline-flex items-center gap-2 rounded-full bg-[#1c8f53] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#177e48] dark:bg-primary dark:hover:bg-primary-accent"
            >
              Start your budget <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link to={PUBLIC_ROUTES.faq} className="text-sm font-semibold text-gray-600 underline decoration-gray-300 underline-offset-4 hover:text-[#1d3d2d] dark:text-text-secondary dark:hover:text-text-primary">
              Browse help topics
            </Link>
          </div>
          <div className="mt-10 flex max-w-lg flex-wrap gap-2">
            {groups.map(({ key, eyebrow }, index) => (
              <a
                key={key}
                href={`#${key}`}
                className="flex items-center gap-1.5 rounded-full bg-[#f6f4ee] px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-[#e5f1e5] hover:text-[#1c8f53] dark:bg-white/5 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-primary-accent"
              >
                <span className="text-[10px] font-bold text-[#1c8f53]/70 dark:text-primary-accent/70">0{index + 1}</span>
                {eyebrow}
              </a>
            ))}
          </div>
        </div>
        <DeviceShowcase
          screenshot={assets.screenshots.dashboard}
          screenshotAlt="Campus Coin dashboard showing spending totals, a spending breakdown, and recent transactions"
        />
      </section>

      {groups.map(({ key, eyebrow, title, description, accent, chip, image, imageAlt, reverse, items }, index) => (
        <section
          key={key}
          id={key}
          className={`scroll-mt-24 ${index % 2 === 1 ? 'bg-[#f6f4ee]/60 dark:bg-white/[0.015]' : ''}`}
        >
          <div className={`mx-auto grid max-w-[1200px] items-center gap-9 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
            <div className="py-2">
              <p className={`text-xs font-bold uppercase tracking-[0.14em] ${accent}`}>{eyebrow}</p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight text-[#1d3d2d] dark:text-text-primary sm:text-4xl">{title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 dark:text-text-secondary sm:text-base">{description}</p>

              <ul className="mt-7 space-y-5">
                {items.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                  <li key={itemTitle} className="flex gap-4">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${chip}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#1d3d2d] dark:text-text-primary">{itemTitle}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-text-secondary">{itemDescription}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <BrowserFrame src={image} alt={imageAlt} />
          </div>
        </section>
      ))}

      {/* ── CTA ── */}
      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-6 rounded-[28px] bg-[#d7f0d1] px-6 py-10 dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-12">
          <div>
            <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary">Put your money in view.</h2>
            <p className="mt-2 text-sm text-[#1d3d2d]/70 dark:text-text-secondary">Free to use, no bank account required, and you stay in control of every entry.</p>
          </div>
          <Link
            to={PUBLIC_ROUTES.register}
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-[#1c8f53] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#177e48] hover:shadow-lg hover:shadow-[#1c8f53]/20 dark:bg-primary dark:hover:bg-primary-accent"
          >
            Get started free <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
