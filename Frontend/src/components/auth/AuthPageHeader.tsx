import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AuthPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  compact?: boolean;
}

/**
 * Title + subtitle used at the top of every auth card.
 * The icon prop is kept for API compatibility but the design no longer
 * uses it — the branding lives in the hero panel.
 */
export function AuthPageHeader({ title, subtitle, compact = false }: AuthPageHeaderProps) {
  return (
    <div className={cn('space-y-1', compact ? 'mb-4' : 'mb-6')}>
      <h1
        className={cn(
          'font-extrabold tracking-tight text-gray-900 dark:text-text-primary',
          compact ? 'text-xl' : 'text-2xl sm:text-3xl',
        )}
      >
        {title}
      </h1>
      <p className={cn('text-gray-500 dark:text-text-secondary', compact ? 'text-xs' : 'text-sm')}>
        {subtitle}
      </p>
    </div>
  );
}
