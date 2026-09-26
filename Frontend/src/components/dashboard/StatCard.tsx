import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

type StatTone = 'brand' | 'red' | 'blue' | 'amber' | 'purple';

const toneStyles: Record<StatTone, string> = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent',
  red: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400',
};

const toneHintStyles: Record<StatTone, string> = {
  brand: 'text-brand-600 dark:text-primary-accent',
  red: 'text-red-500 dark:text-red-400',
  blue: 'text-blue-500 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  purple: 'text-purple-500 dark:text-purple-400',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  /** Color the hint text to match the card's tone instead of neutral gray (e.g. a "12% higher than last month" caption). */
  hintTone?: boolean;
  tone?: StatTone;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, hint, hintTone = false, tone = 'brand', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-border dark:bg-surface-elevated dark:shadow-black/20',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500 dark:text-text-secondary">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-text-primary">{value}</p>
        </div>
      </div>
      {hint && <p className={cn('mt-3 text-xs', hintTone ? toneHintStyles[tone] : 'text-gray-500 dark:text-text-muted')}>{hint}</p>}
    </div>
  );
}
