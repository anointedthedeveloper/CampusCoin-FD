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

const groups = [
  {
    key: 'track',
    eyebrow: 'Track',
    title: 'Log every naira, in seconds',
    description:
      'Quick-add forms for income and expenses, built around how student money actually moves — no bank linking, no waiting for a sync.',
    accent: 'text-[#1c8f53]',
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
    accent: 'text-blue-600',
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
    accent: 'text-amber-600',
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
    accent: 'text-purple-600',
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
    <div>
      <section className="mx-auto max-w-[1280px] px-4 pb-4 pt-10 sm:px-6 lg:pt-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1a8f57] dark:text-[var(--primary-accent)]">Features</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-[#1d3d2d] dark:text-text-primary sm:text-5xl">
          Everything you need to manage student money, nothing you don&apos;t
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-text-secondary sm:text-lg">
          Four things Campus Coin actually does — track what moves, plan around it, understand the
          pattern, and get a little better each month.
        </p>
      </section>

      {groups.map(({ key, eyebrow, title, description, accent, image, imageAlt, reverse, items }) => (
        <section key={key} className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
          <div
            className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
              reverse ? 'lg:[&>*:first-child]:order-2' : ''
            }`}
          >
            <div>
              <span className={`text-sm font-semibold uppercase tracking-wide ${accent} dark:brightness-125`}>{eyebrow}</span>
              <h2 className="mt-2 text-2xl font-bold text-[#1d3d2d] dark:text-text-primary sm:text-3xl">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-text-secondary sm:text-base">{description}</p>

              <ul className="mt-6 space-y-5">
                {items.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                  <li key={itemTitle} className="group flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6f4ee] text-[#1c8f53] transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#d7f0d1] dark:bg-white/10 dark:text-[var(--primary-accent)] dark:group-hover:bg-white/15">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-[#1d3d2d] dark:text-text-primary">{itemTitle}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">{itemDescription}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-[#f6f4ee] p-3 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-surface-elevated dark:shadow-black/20 dark:hover:shadow-black/30">
              <img
                src={image}
                alt={imageAlt}
                className="w-full rounded-2xl object-cover object-top shadow-sm"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-[#d7f0d1] px-6 py-10 text-center dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:py-12">
          <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary sm:text-3xl">See it on your own transactions</h2>
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
