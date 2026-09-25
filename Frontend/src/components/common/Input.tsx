import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
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
              'font-medium text-gray-700 select-none',
              compact ? 'text-xs leading-4' : 'text-sm',
            )}
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-brand-500" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="group relative">
          {icon && (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 left-0 flex items-center text-gray-400 transition-colors duration-150 group-focus-within:text-brand-500',
                compact ? 'pl-3' : 'pl-3.5',
              )}
            >
              {icon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            className={cn(
              // base
              'w-full rounded-xl border bg-white text-gray-900 shadow-sm transition-all duration-150',
              'placeholder:text-gray-400/80 placeholder:font-normal',
              // sizing
              compact ? 'py-2 text-sm' : 'py-2.5 text-[15px]',
              'px-4',
              icon && (compact ? 'pl-9' : 'pl-10'),
              trailing && 'pr-11',
              // default border
              error
                ? 'border-red-400 bg-red-50/30'
                : 'border-gray-200 hover:border-gray-300',
              // focus
              error
                ? 'focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20'
                : 'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25',
              // disabled
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200',
              className,
            )}
            {...props}
          />

          {trailing && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3.5">
              {trailing}
            </span>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1 text-xs font-medium text-red-600 leading-none mt-0.5">
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1Zm-.75 2.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0v-2.5ZM6 9a.75.75 0 1 1 0-1.5A.75.75 0 0 1 6 9Z" />
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-xs text-gray-400 leading-none mt-0.5">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
