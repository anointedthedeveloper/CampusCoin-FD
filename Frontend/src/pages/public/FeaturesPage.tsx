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
    <div className="overflow-hidden">
      <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pb-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:pt-16">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1a8f57] dark:text-primary-accent">
            <span className="h-2 w-2 rounded-full bg-[#1a8f57] dark:bg-primary-accent" /> Made for student money
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-bold leading-[1.08] text-[#1d3d2d] dark:text-text-primary sm:text-5xl lg:text-[3.5rem]">
            A clearer picture of where your money goes.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-gray-600 dark:text-text-secondary">
            Track what moves, plan around it, understand the pattern, and make your next decision with a little more confidence.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link to={PUBLIC_ROUTES.register} className="inline-flex items-center gap-2 border-b-2 border-[#1c8f53] pb-1 text-sm font-bold text-[#1c8f53] transition-colors hover:text-[#146b3d] dark:text-primary-accent dark:hover:text-white">
              Start your budget <span aria-hidden="true">-&gt;</span>
            </Link>
            <Link to={PUBLIC_ROUTES.faq} className="text-sm font-semibold text-gray-600 underline decoration-gray-300 underline-offset-4 hover:text-[#1d3d2d] dark:text-text-secondary dark:hover:text-text-primary">
              Browse help topics
            </Link>
          </div>
          <div className="mt-10 grid max-w-lg grid-cols-4 border-t border-[#1d3d2d]/15 pt-4 dark:border-white/15">
            {groups.map(({ key, eyebrow }, index) => (
              <a key={key} href={`#${key}`} className="text-xs font-semibold text-gray-600 transition-colors hover:text-[#1c8f53] dark:text-text-secondary dark:hover:text-primary-accent">
                <span className="mb-1 block text-[10px] font-bold text-[#1c8f53]/70 dark:text-primary-accent/70">0{index + 1}</span>
                {eyebrow}
              </a>
            ))}
          </div>
        </div>
        <figure className="relative min-w-0 border border-[#1d3d2d]/10 bg-[#edf4ec] p-2 dark:border-white/10 dark:bg-surface-elevated">
          <img src={assets.screenshots.dashboard} alt="Campus Coin dashboard showing spending totals, a spending breakdown, and recent transactions" className="block w-full object-cover object-top" />
          <figcaption className="flex items-center justify-between gap-4 border-t border-[#1d3d2d]/10 px-3 py-3 text-xs text-gray-600 dark:border-white/10 dark:text-text-secondary">
            <span>One view for your day-to-day money</span>
            <span className="font-semibold text-[#1c8f53] dark:text-primary-accent">Dashboard</span>
          </figcaption>
        </figure>
      </section>

      {groups.map(({ key, eyebrow, title, description, accent, image, imageAlt, reverse, items }) => (
        <section key={key} id={key} className="scroll-mt-24 border-t border-[#1d3d2d]/10 dark:border-white/10">
          <div className={`mx-auto grid max-w-[1200px] items-center gap-9 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
            <div className="py-2">
              <p className={`text-xs font-bold uppercase tracking-[0.14em] ${accent} dark:brightness-125`}>{eyebrow}</p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight text-[#1d3d2d] dark:text-text-primary sm:text-4xl">{title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 dark:text-text-secondary sm:text-base">{description}</p>

              <ul className="mt-7 divide-y divide-[#1d3d2d]/10 border-y border-[#1d3d2d]/10 dark:divide-white/10 dark:border-white/10">
                {items.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                  <li key={itemTitle} className="flex gap-4 py-4 first:pt-4 last:pb-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-[#e5f1e5] text-[#1c8f53] dark:bg-white/10 dark:text-primary-accent">
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

            <figure className="min-w-0 border border-[#1d3d2d]/10 bg-white p-2 dark:border-white/10 dark:bg-surface-elevated">
              <img
                src={image}
                alt={imageAlt}
                className="block w-full object-cover object-top"
                loading="lazy"
              />
            </figure>
          </div>
        </section>
      ))}

      <section className="border-t border-[#1d3d2d]/10 bg-[#eaf2e8] dark:border-white/10 dark:bg-surface-elevated">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between md:py-12">
          <div>
            <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary">Put your money in view.</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-text-secondary">Free to use, no bank account required, and you stay in control of every entry.</p>
          </div>
          <Link to={PUBLIC_ROUTES.register} className="inline-flex w-fit items-center gap-2 bg-[#1c8f53] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#177e48] dark:bg-primary dark:hover:bg-primary-accent">
            Get started free <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
