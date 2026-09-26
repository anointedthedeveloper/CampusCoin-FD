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

/** Full-page centred spinner for route-level loading */
export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
