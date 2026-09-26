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
        'group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200',
        'hover:-translate-y-0.5 active:translate-y-0',
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:border-primary-accent dark:bg-primary-accent/10 dark:text-primary-accent'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm dark:border-border dark:bg-surface-elevated dark:text-text-secondary dark:hover:border-white/20',
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white dark:bg-primary-accent">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
      {Icon && (
        <Icon
          className={cn(
            'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
            selected ? 'text-brand-600 dark:text-primary-accent' : 'text-gray-400 dark:text-text-muted',
          )}
        />
      )}
      <span className="text-sm font-medium leading-tight">{label}</span>
    </button>
  );
}
