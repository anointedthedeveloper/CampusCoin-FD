import { Link } from 'react-router-dom';
import { EyeOff, Lightbulb, ListChecks, Sparkles, Wallet } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { assets } from '@/assets/images';

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
    <div className="overflow-hidden">
      <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1a8f57] dark:text-primary-accent">The thinking behind Campus Coin</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.08] text-[#1d3d2d] dark:text-text-primary sm:text-5xl lg:text-[3.5rem]">
            Money management should fit student life.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-text-secondary">
            Most finance apps assume a fixed paycheck and a linked bank account. Campus Coin starts somewhere more familiar: allowance, gig work, scholarships, gifts, and the everyday costs of campus.
          </p>
          <Link to={PUBLIC_ROUTES.features} className="mt-7 inline-flex items-center gap-2 border-b-2 border-[#1c8f53] pb-1 text-sm font-bold text-[#1c8f53] transition-colors hover:text-[#146b3d] dark:text-primary-accent dark:hover:text-white">
            Explore how it works <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
        <figure className="relative flex min-h-[300px] items-center justify-center overflow-hidden bg-[#e6f0e4] px-8 pt-8 dark:bg-surface-elevated sm:min-h-[390px]">
          <div className="absolute left-0 top-0 h-1 w-20 bg-[#1c8f53]" />
          <img src={assets.heroPhone} alt="Campus Coin mobile dashboard preview" className="relative z-10 max-h-[360px] max-w-full object-contain object-bottom" />
          <figcaption className="absolute bottom-4 left-4 text-xs font-semibold text-[#1d3d2d]/70 dark:text-text-secondary">A practical view of your money, wherever you are</figcaption>
        </figure>
      </section>

      <section className="border-y border-[#1d3d2d]/10 bg-white/60 dark:border-white/10 dark:bg-surface/50">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.7fr_1fr_1fr] lg:gap-12 lg:py-16">
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
              Campus Coin makes it easy to log money, see spending by category, and get useful saving tips from your own history. Optional AI suggestions stay reviewable and under your control.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1c8f53] dark:text-primary-accent">What guides the product</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1d3d2d] dark:text-text-primary">Useful by design.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-gray-600 dark:text-text-secondary">Tools for building a clearer picture, without handing over control.</p>
        </div>
        <div className="mt-8 grid border-y border-[#1d3d2d]/10 sm:grid-cols-2 dark:border-white/10">
          {values.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className={`flex gap-4 py-6 ${index % 2 === 0 ? 'sm:border-r sm:border-[#1d3d2d]/10 sm:pr-8 dark:sm:border-white/10' : 'sm:pl-8'} ${index < 2 ? 'border-b border-[#1d3d2d]/10 dark:border-white/10' : ''}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#e5f1e5] text-[#1c8f53] dark:bg-white/10 dark:text-primary-accent">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#1d3d2d] dark:text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-text-secondary">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#122a1f] text-white dark:bg-surface-elevated">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-3 text-[#78d99a] dark:text-primary-accent">
            <ListChecks className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">How it works</p>
          </div>
          <div className="mt-8 grid gap-0 sm:grid-cols-3">
            {steps.map(({ step, title, description }, index) => (
              <div key={step} className={`py-5 sm:pr-7 ${index > 0 ? 'border-t border-white/15 sm:border-l sm:border-t-0 sm:pl-7' : ''}`}>
                <span className="text-xs font-bold text-[#78d99a] dark:text-primary-accent">{step}</span>
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-10 sm:px-6 sm:py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1d3d2d] dark:text-text-primary">Ready to see where your money goes?</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-text-secondary">Free to use, no bank account required, and you stay in control.</p>
        </div>
        <Link to={PUBLIC_ROUTES.register} className="inline-flex w-fit items-center gap-2 bg-[#1c8f53] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#177e48] dark:bg-primary dark:hover:bg-primary-accent">
          Get started free <span aria-hidden="true">-&gt;</span>
        </Link>
      </section>
    </div>
  );
}
