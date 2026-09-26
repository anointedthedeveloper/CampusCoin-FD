import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AuthPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  compact?: boolean;
}

/** Icon + title + subtitle used at the top of every auth card (login, register, forgot/reset password). */
export function AuthPageHeader({ icon: Icon, title, subtitle, compact = false }: AuthPageHeaderProps) {
  return (
    <div className={cn('flex items-start', compact ? 'gap-3' : 'gap-4')}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm',
          compact ? 'h-9 w-9' : 'h-12 w-12',
        )}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
      <div>
        <h1 className={cn('font-bold text-gray-900 dark:text-text-primary', compact ? 'text-lg' : 'text-xl sm:text-2xl')}>{title}</h1>
        <p className={cn('text-gray-500 dark:text-text-secondary', compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm')}>{subtitle}</p>
      </div>
    </div>
  );
}
