import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-text-secondary',
  success: 'bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
