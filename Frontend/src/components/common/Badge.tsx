import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
type BadgeSize = 'sm' | 'md';

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-text-secondary',
  brand:   'bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  danger:  'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  info:    'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-2xs',
  md: 'px-2.5 py-0.5 text-xs',
};

export function Badge({
  tone = 'neutral',
  size = 'md',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; size?: BadgeSize }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        toneStyles[tone],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
