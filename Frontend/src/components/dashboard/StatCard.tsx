import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

type StatTone = 'brand' | 'red' | 'blue' | 'amber' | 'purple' | 'teal';

const toneConfig: Record<StatTone, {
  icon: string;
  value: string;
  badge: string;
}> = {
  brand:  { icon: 'bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent',         value: 'text-gray-900 dark:text-text-primary', badge: 'text-brand-600 dark:text-primary-accent' },
  red:    { icon: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',                    value: 'text-gray-900 dark:text-text-primary', badge: 'text-red-600 dark:text-red-400' },
  blue:   { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',                value: 'text-gray-900 dark:text-text-primary', badge: 'text-blue-600 dark:text-blue-400' },
  amber:  { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',            value: 'text-gray-900 dark:text-text-primary', badge: 'text-amber-600 dark:text-amber-400' },
  purple: { icon: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400',        value: 'text-gray-900 dark:text-text-primary', badge: 'text-purple-600 dark:text-purple-400' },
  teal:   { icon: 'bg-teal-100 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400',               value: 'text-gray-900 dark:text-text-primary', badge: 'text-teal-600 dark:text-teal-400' },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  hintTone?: boolean;
  tone?: StatTone;
  className?: string;
  /** Optional delta badge, e.g. "+12% vs last month" */
  delta?: string;
  deltaPositive?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  hintTone = false,
  tone = 'brand',
  className,
  delta,
  deltaPositive,
}: StatCardProps) {
  const cfg = toneConfig[tone];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white p-5',
        'border-gray-100 shadow-card transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-gray-200',
        'dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-dark-card dark:hover:shadow-dark-card-hover dark:hover:border-white/10',
        className,
      )}
    >
      {/* Subtle background tint on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-gradient-to-br from-gray-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-text-secondary truncate">{label}</p>
          <p className={cn('mt-1.5 text-2xl font-bold tracking-tight', cfg.value)}>{value}</p>
          {hint && (
            <p className={cn(
              'mt-1 text-xs',
              hintTone ? cfg.badge : 'text-gray-400 dark:text-text-muted',
            )}>
              {hint}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            cfg.icon,
          )}>
            <Icon className="h-4.5 w-4.5 h-[1.125rem] w-[1.125rem]" />
          </span>
          {delta !== undefined && (
            <span className={cn(
              'inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-semibold',
              deltaPositive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
            )}>
              {deltaPositive ? '↑' : '↓'} {delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
