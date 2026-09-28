import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SelectableCardProps {
  icon?: LucideIcon;
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function SelectableCard({ icon: Icon, label, selected, onToggle }: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-2.5 rounded-2xl p-4 text-center',
        'transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
        // Light mode: visible border everywhere, strong selected state
        selected
          ? [
              'border-2 border-brand-500 bg-brand-50 text-brand-700 shadow-[0_0_0_1px_rgba(22,163,74,0.15),0_2px_8px_rgba(22,163,74,0.12)]',
              'dark:border-primary-accent dark:bg-primary-accent/10 dark:text-primary-accent',
            ]
          : [
              'border-2 border-gray-200 bg-white text-gray-700',
              'hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm',
              'dark:border-white/10 dark:bg-surface-elevated dark:text-text-secondary',
              'dark:hover:border-white/20 dark:hover:bg-white/[0.04]',
            ],
      )}
    >
      {/* Checkmark */}
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white dark:bg-primary-accent">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}

      {/* Icon */}
      {Icon && (
        <Icon
          className={cn(
            'h-6 w-6 transition-transform duration-200 group-hover:scale-110',
            selected
              ? 'text-brand-600 dark:text-primary-accent'
              : 'text-gray-400 dark:text-text-muted',
          )}
        />
      )}

      <span
        className={cn(
          'text-sm font-semibold leading-tight',
          selected
            ? 'text-brand-700 dark:text-primary-accent'
            : 'text-gray-700 dark:text-text-secondary',
        )}
      >
        {label}
      </span>
    </button>
  );
}
