import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove default padding so the consumer controls spacing entirely */
  noPadding?: boolean;
  /** Subtle hover lift + shadow intensification */
  hoverable?: boolean;
}

export function Card({ className, noPadding = false, hoverable = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // Base surface
        'rounded-xl border bg-white',
        'border-gray-100 shadow-card',
        // Dark
        'dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-dark-card',
        // Optional hover effect
        hoverable && [
          'cursor-pointer transition-all duration-200',
          'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-gray-200',
          'dark:hover:shadow-dark-card-hover dark:hover:border-white/10',
        ],
        // Default padding unless suppressed
        !noPadding && 'p-5',
        className,
      )}
      {...props}
    />
  );
}
