import { Link } from 'react-router-dom';
import { EyeOff, Lightbulb, ListChecks, Sparkles, Wallet, Landmark, ArrowLeftRight, CreditCard, ShieldCheck, Bot, BadgeX } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { assets } from '@/assets';
import { QuickGuideVideo, WatchGuideButton } from '@/components/common';

const values = [
  {
    icon: Wallet,
    title: 'Built for irregular money',
    description:
      'Allowance, gig work, scholarships, the occasional gift — Campus Coin treats every income source as normal, not an edge case.',
    badgeClassName: 'bg-[#d7f0d1] text-[#1c8f53] dark:bg-white/10 dark:text-primary-accent',
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
    title: 'Log income & expenses',
    description: 'Quick-add allowance, gig income, scholarships, and gifts, or expenses like food, transport, and hostel costs — sorted into student-relevant categories.',
  },
  {
    step: '02',
    title: 'Set budgets, track live',
    description: 'Cap monthly spending per category and watch a real-time progress bar, with an alert before you go over.',
  },
  {
    step: '03',
    title: 'See it broken down',
    description: 'A dashboard and monthly reports show category breakdowns, income vs. expense trends, and daily spending patterns.',
  },
  {
    step: '04',
    title: 'Get smarter over time',
    description: 'Personalized saving tips and optional AI-assisted categorization, both generated from your own transaction history.',
  },
];

export function AboutPage() {
  return (
    <div className="overflow-hidden">
      <QuickGuideVideo />
      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-[1280px] items-center gap-8 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10 lg:pt-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1a8f57] dark:text-primary-accent">The thinking behind Campus Coin</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.08] text-[#1d3d2d] dark:text-text-primary sm:text-5xl lg:text-[2.9rem] xl:text-[3.1rem]">
            Money management should fit student life.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-text-secondary">
            Most finance apps assume a fixed paycheck and a linked bank account. Campus Coin starts somewhere more familiar: allowance, gig work, scholarships, gifts, and the everyday costs of campus.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-6">
          <Link to={PUBLIC_ROUTES.features} className="inline-flex items-center gap-2 border-b-2 border-[#1c8f53] pb-1 text-sm font-bold text-[#1c8f53] transition-colors hover:text-[#146b3d] dark:text-primary-accent dark:hover:text-white">
            Explore how it works <span aria-hidden="true">&rarr;</span>
          </Link>
          <WatchGuideButton />
          </div>
        </div>
        <figure className="relative min-h-[340px] overflow-hidden rounded-[28px] shadow-card dark:shadow-dark-card sm:min-h-[440px] lg:min-h-[520px]">
          <span className="absolute left-6 top-6 z-10 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#1c8f53] shadow-sm dark:bg-white/10 dark:text-primary-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1c8f53] dark:bg-primary-accent" />
            Built for campus life
          </span>
          <img
            src={assets.aboutDeskDark}
            alt="Laptop and phone showing the Campus Coin dashboard on a desk"
            className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
            loading="eager"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
          <figcaption className="absolute bottom-5 left-6 right-6 text-xs font-semibold text-white/90">
            A practical view of your money, wherever you are
          </figcaption>
        </figure>
      </section>

      {/* ── Why it exists ── */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="grid gap-8 rounded-[28px] bg-white/70 p-6 shadow-card dark:bg-surface-elevated dark:shadow-dark-card sm:p-10 lg:grid-cols-[0.7fr_1fr_1fr] lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1c8f53] dark:text-primary-accent">Why it exists</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-[#1d3d2d] dark:text-text-primary">A different starting point.</h2>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1d3d2d] dark:text-text-primary">The reality</h3>
            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-text-secondary">
              Students often receive money from several irregular sources and rarely have a simple way to see where it goes. Tools made for salaried adults can feel complex, costly, or disconnected from campus spending.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1d3d2d] dark:text-text-primary">Our response</h3>
            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-text-secondary">
              Campus Coin lets you log income and expenses by category, set monthly budgets with real-time alerts, and read reports that break spending down by month, week, and day. Saving tips and optional AI categorization are both generated from your own history, and always reviewable before anything is saved.
            </p>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1c8f53] dark:text-primary-accent">What guides the product</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1d3d2d] dark:text-text-primary">Useful by design.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-gray-600 dark:text-text-secondary">Tools for building a clearer picture, without handing over control.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, description, badgeClassName }) => (
            <article
              key={title}
              className="group flex gap-4 rounded-[26px] bg-[#f6f4ee] p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg dark:bg-surface-elevated dark:hover:bg-white/[0.04] dark:hover:shadow-black/30"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${badgeClassName}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#1d3d2d] dark:text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-text-secondary">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="rounded-[28px] bg-[#122a1f] px-6 py-10 text-white dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:px-10 sm:py-12">
          <div className="flex items-center gap-3 text-[#78d99a] dark:text-primary-accent">
            <ListChecks className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">How it works</p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ step, title, description }) => (
              <div key={step}>
                <span className="text-xs font-bold text-[#78d99a] dark:text-primary-accent">{step}</span>
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Boundaries ── */}
      <section className="mx-auto max-w-[1280px] px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="grid gap-8 rounded-[28px] border border-[#1d3d2d]/10 bg-white/70 p-6 dark:border-white/10 dark:bg-surface-elevated sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1a8f57] dark:text-primary-accent">Clear boundaries</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-[#1d3d2d] dark:text-text-primary">What Campus Coin will never do.</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-text-secondary">It&apos;s a budgeting tool, not a bank. That keeps it simple — and keeps your money where it already is.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Landmark, text: 'Ask for your bank login or connect to your bank account.' },
              { icon: ArrowLeftRight, text: 'Move, send or receive real money.' },
              { icon: CreditCard, text: 'Process payments or store card details.' },
              { icon: ShieldCheck, text: 'Let anyone else see your financial records.' },
              { icon: Bot, text: 'Make decisions for you — AI only ever suggests.' },
              { icon: BadgeX, text: 'Pass off estimates as certified financial advice.' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 rounded-2xl bg-[#f6f4ee] p-4 text-sm text-[#1d3d2d] dark:bg-white/[0.04] dark:text-text-secondary">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#1c8f53] dark:text-primary-accent" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-6 rounded-[28px] bg-[#d7f0d1] px-6 py-10 dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-12">
          <div>
            <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary">Ready to see where your money goes?</h2>
            <p className="mt-2 text-sm text-[#1d3d2d]/70 dark:text-text-secondary">Free to use, no bank account required, and you stay in control.</p>
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
