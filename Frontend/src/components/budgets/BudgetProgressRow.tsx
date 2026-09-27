import { getBudgetStatus, getBudgetUtilization } from '@/services/budget.service';
import { DEFAULT_CATEGORY_ICON, EXPENSE_CATEGORY_ICONS } from '@/constants/categoryIcons';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Budget } from '@/types/budget';

const statusBar: Record<string, string> = {
  'on-track': 'bg-brand-500 dark:bg-primary-accent',
  warning:    'bg-amber-500',
  exceeded:   'bg-red-500',
};

const statusLabel: Record<string, string> = {
  'on-track': 'text-brand-600 dark:text-primary-accent',
  warning:    'text-amber-600 dark:text-amber-400',
  exceeded:   'text-red-600 dark:text-red-400',
};

interface BudgetProgressRowProps {
  categoryName: string;
  budget: Budget;
}

export function BudgetProgressRow({ categoryName, budget }: BudgetProgressRowProps) {
  const utilization = getBudgetUtilization(budget);
  const status      = getBudgetStatus(budget);
  const { icon: Icon, badgeClassName } = EXPENSE_CATEGORY_ICONS[categoryName] ?? DEFAULT_CATEGORY_ICON;

  const remaining = budget.limitAmount - budget.spentAmount;
  const isOver    = remaining < 0;

  return (
    <div className="py-4">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          badgeClassName,
        )}>
          <Icon className="h-4 w-4" />
        </span>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">
              {categoryName}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-xs text-gray-500 dark:text-text-secondary sm:block tabular-nums">
                {formatCurrency(budget.spentAmount, DEFAULT_CURRENCY)}
                <span className="text-gray-300 dark:text-text-muted"> / {formatCurrency(budget.limitAmount, DEFAULT_CURRENCY)}</span>
              </span>
              <span className={cn('text-xs font-bold tabular-nums', statusLabel[status])}>
                {utilization}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/8">
            <div
              className={cn('h-full rounded-full transition-all duration-700 ease-spring', statusBar[status])}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>

          {/* Spent / remaining — mobile */}
          <div className="mt-1 flex items-center justify-between sm:hidden">
            <p className="text-xs text-gray-500 dark:text-text-secondary tabular-nums">
              {formatCurrency(budget.spentAmount, DEFAULT_CURRENCY)} of {formatCurrency(budget.limitAmount, DEFAULT_CURRENCY)}
            </p>
            <p className={cn(
              'text-xs font-medium tabular-nums',
              isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-text-muted',
            )}>
              {isOver
                ? `${formatCurrency(Math.abs(remaining), DEFAULT_CURRENCY)} over`
                : `${formatCurrency(remaining, DEFAULT_CURRENCY)} left`}
            </p>
          </div>

          {/* Remaining — desktop */}
          <div className="mt-1 hidden sm:flex items-center justify-end">
            <p className={cn(
              'text-xs font-medium tabular-nums',
              isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-text-muted',
            )}>
              {isOver
                ? `${formatCurrency(Math.abs(remaining), DEFAULT_CURRENCY)} over budget`
                : `${formatCurrency(remaining, DEFAULT_CURRENCY)} remaining`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
