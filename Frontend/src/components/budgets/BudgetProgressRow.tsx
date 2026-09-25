import { getBudgetStatus, getBudgetUtilization } from '@/services/budget.service';
import { DEFAULT_CATEGORY_ICON, EXPENSE_CATEGORY_ICONS } from '@/constants/categoryIcons';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Budget } from '@/types/budget';

const statusBarColor = {
  'on-track': 'bg-brand-500',
  warning: 'bg-amber-500',
  exceeded: 'bg-red-500',
} as const;

interface BudgetProgressRowProps {
  categoryName: string;
  budget: Budget;
}

export function BudgetProgressRow({ categoryName, budget }: BudgetProgressRowProps) {
  const utilization = getBudgetUtilization(budget);
  const status = getBudgetStatus(budget);
  const { icon: Icon, badgeClassName } = EXPENSE_CATEGORY_ICONS[categoryName] ?? DEFAULT_CATEGORY_ICON;

  return (
    <div className="py-3">
      {/* Mobile: icon + name + percent on one line, bar below, spent/budget under that. */}
      <div className="flex items-center gap-3 sm:hidden">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', badgeClassName)}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{categoryName}</p>
        <span className="shrink-0 text-sm font-semibold text-gray-700">{utilization}%</span>
      </div>
      <div className="mt-2 sm:hidden">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn('h-full rounded-full transition-all duration-500', statusBarColor[status])}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {formatCurrency(budget.spentAmount, DEFAULT_CURRENCY)} / {formatCurrency(budget.limitAmount, DEFAULT_CURRENCY)}
        </p>
      </div>

      {/* sm and up: original single-row layout. */}
      <div className="hidden items-center gap-4 sm:flex">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', badgeClassName)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="w-28 shrink-0 sm:w-36">
          <p className="text-sm font-medium text-gray-900">{categoryName}</p>
          <p className="text-xs text-gray-500">Spent / Budget</p>
        </div>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full transition-all duration-500', statusBarColor[status])}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>
        <div className="w-32 shrink-0 text-right text-sm sm:w-36">
          <span className="font-medium text-gray-900">{formatCurrency(budget.spentAmount, DEFAULT_CURRENCY)}</span>
          <span className="text-gray-400"> / {formatCurrency(budget.limitAmount, DEFAULT_CURRENCY)}</span>
        </div>
        <div className="w-10 shrink-0 text-right text-sm font-semibold text-gray-700">{utilization}%</div>
      </div>
    </div>
  );
}
