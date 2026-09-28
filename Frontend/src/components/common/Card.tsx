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
        'rounded-xl bg-white',
        // Light mode: visible border + layered shadow so cards stand out on #f8faf8
        'border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(15,40,30,0.05)]',
        // Dark
        'dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-dark-card',
        // Optional hover effect
        hoverable && [
          'cursor-pointer transition-all duration-200',
          'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-gray-300/70',
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
