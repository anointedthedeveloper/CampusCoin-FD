import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md',
        'dark:border-border dark:bg-surface-elevated dark:shadow-black/20 dark:hover:shadow-black/30',
        className,
      )}
      {...props}
    />
  );
}
