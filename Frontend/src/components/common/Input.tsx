import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, trailing, id, className, compact = false, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className={cn('flex flex-col', compact ? 'gap-1' : 'gap-1.5')}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'select-none font-medium text-gray-700 dark:text-text-secondary',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-brand-500 dark:text-primary-accent" aria-hidden="true"> *</span>
            )}
          </label>
        )}

        <div className="group relative">
          {icon && (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 left-0 flex items-center text-gray-400 transition-colors duration-150',
                'group-focus-within:text-brand-500 dark:text-text-muted dark:group-focus-within:text-primary-accent',
                compact ? 'pl-3 [&>svg]:h-3.5 [&>svg]:w-3.5' : 'pl-3.5 [&>svg]:h-4 [&>svg]:w-4',
              )}
            >
              {icon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            className={cn(
              // Base
              'w-full rounded-lg border bg-white text-gray-900 shadow-inset',
              'placeholder:text-gray-400/70 placeholder:font-normal',
              'transition-all duration-150',
              // Dark
              'dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted/60 dark:shadow-none',
              // Sizing
              compact ? 'py-1.5 text-sm' : 'py-2.5 text-sm',
              'px-3.5',
              icon && (compact ? 'pl-9' : 'pl-10'),
              trailing && 'pr-10',
              // Error vs normal border
              error
                ? [
                    'border-red-300 bg-red-50/40',
                    'focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20',
                    'dark:border-red-500/50 dark:bg-red-950/20',
                    'dark:focus:border-red-400 dark:focus:ring-red-400/20',
                  ]
                : [
                    'border-gray-200 hover:border-gray-300',
                    'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                    'dark:border-white/8 dark:hover:border-white/15',
                    'dark:focus:border-primary-accent/70 dark:focus:ring-primary-accent/20',
                  ],
              // Disabled
              'disabled:cursor-not-allowed disabled:opacity-60',
              className,
            )}
            {...props}
          />

          {trailing && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3">
              {trailing}
            </span>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-xs text-gray-400 dark:text-text-muted leading-relaxed">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
