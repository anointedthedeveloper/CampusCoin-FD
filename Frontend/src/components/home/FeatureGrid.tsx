import { ArrowUpRight, Clock, PiggyBank, Wallet, Zap } from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Track Spending',
    description: 'See where your money goes with a clear category breakdown.',
    badgeClassName: 'bg-brand-700 text-white dark:bg-primary',
  },
  {
    icon: Wallet,
    title: 'Budget Smarter',
    description: 'Set limits per category and watch progress update in real time.',
    badgeClassName: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
  },
  {
    icon: PiggyBank,
    title: 'Save for Tomorrow',
    description: 'Get saving tips generated from your own habits, not a template.',
    badgeClassName: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
  },
  {
    icon: Zap,
    title: 'Fast & Easy',
    description: 'Log a transaction in seconds, from your phone or laptop.',
    badgeClassName: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400',
  },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {features.map(({ icon: Icon, title, description, badgeClassName }, index) => (
        <div
          key={title}
          style={{ animationDelay: `${300 + index * 100}ms` }}
          className="group animate-fade-in-up rounded-[26px] bg-[#f6f4ee] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg dark:bg-surface-elevated dark:hover:bg-white/[0.04] dark:hover:shadow-black/30"
        >
          <div className="flex items-start justify-between">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${badgeClassName}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <ArrowUpRight className="h-4 w-4 -translate-x-1 translate-y-1 text-gray-300 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-[#1c8f53] group-hover:opacity-100 dark:text-white/20 dark:group-hover:text-primary-accent" />
          </div>
          <h3 className="mt-4 font-semibold text-[#1d3d2d] dark:text-text-primary">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">{description}</p>
        </div>
      ))}
    </div>
  );
}
