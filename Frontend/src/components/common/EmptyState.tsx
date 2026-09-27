import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Use compact layout for inline empty states */
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-8 px-4' : 'gap-3 py-12 px-6',
        'rounded-xl border border-dashed border-gray-200 dark:border-white/8',
        className,
      )}
    >
      {Icon && (
        <span className={cn(
          'flex items-center justify-center rounded-full',
          compact
            ? 'h-9 w-9 bg-gray-100 dark:bg-white/5'
            : 'h-12 w-12 bg-gray-50 dark:bg-white/5',
        )}>
          <Icon className={cn(
            'text-gray-400 dark:text-text-muted',
            compact ? 'h-4 w-4' : 'h-5 w-5',
          )} />
        </span>
      )}
      <div className="space-y-1">
        <h3 className={cn(
          'font-semibold text-gray-800 dark:text-text-primary',
          compact ? 'text-sm' : 'text-base',
        )}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            'text-gray-500 dark:text-text-secondary',
            compact ? 'text-xs' : 'text-sm max-w-xs',
          )}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
