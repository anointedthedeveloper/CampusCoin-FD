import { CoinLoader } from '@/components/common/CoinLoader';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

/** Inline ring spinner — kept for small in-context uses (e.g. button loading states, chat typing indicator) */
export function Spinner({ className, size = 'lg' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full',
        'border-gray-200 border-t-brand-600',
        'dark:border-white/10 dark:border-t-primary-accent',
        sizeMap[size],
        className,
      )}
    />
  );
}

/**
 * Full-page centred coin loader — the standard route-level loading indicator.
 * Replaces the old plain ring spinner so every page load shows the branded
 * CampusCoin coin animation instead of a generic ring.
 *
 * Use `PageSpinner` directly when you control the `isLoading` flag yourself.
 * Pair with `useMinLoadTime` to enforce a minimum 3-second display duration.
 */
export function PageSpinner({ label }: { label?: string } = {}) {
  return (
    <div
      className="flex min-h-[320px] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
    >
      <CoinLoader label={label ?? 'Loading…'} />
    </div>
  );
}
