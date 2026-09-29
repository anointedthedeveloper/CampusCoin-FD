import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, trailing, id, className, compact = false, ...props }, ref) => {
    // Always link the label to the field (screen readers, click-to-focus),
    // even when the caller passes neither id nor name.
    const generatedId = useId();
    const inputId = id ?? props.name ?? generatedId;

    return (
      <div className={cn('flex flex-col', compact ? 'gap-1' : 'gap-1.5')}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'select-none font-semibold text-gray-800 dark:text-text-secondary',
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
                'group-focus-within:text-brand-600 dark:text-text-muted dark:group-focus-within:text-primary-accent',
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
              'w-full rounded-lg border bg-white text-gray-900 font-medium',
              'placeholder:text-gray-400 placeholder:font-normal',
              'transition-all duration-150',
              // Dark
              'dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted/70 dark:shadow-none',
              // Sizing
              compact ? 'py-1.5 text-sm' : 'py-2.5 text-sm',
              'px-3.5',
              icon    && (compact ? 'pl-9' : 'pl-10'),
              trailing && 'pr-10',
              // Error vs normal border
              error
                ? [
                    'border-red-400 bg-red-50/40',
                    'focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20',
                    'dark:border-red-500/50 dark:bg-red-950/20',
                    'dark:focus:border-red-400 dark:focus:ring-red-400/20',
                  ]
                : [
                    // Light mode: clearly visible border with strong hover/focus
                    'border-gray-300 hover:border-gray-400',
                    'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                    // Dark mode
                    'dark:border-white/[0.10] dark:hover:border-white/20',
                    'dark:focus:border-primary-accent/70 dark:focus:ring-primary-accent/20',
                  ],
              // Disabled
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50',
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
          <p className="text-xs text-gray-500 dark:text-text-muted leading-relaxed">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
