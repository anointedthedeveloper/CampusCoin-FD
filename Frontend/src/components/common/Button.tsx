import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-btn-primary ' +
    'hover:bg-brand-700 hover:shadow-btn-primary-hover ' +
    'active:bg-brand-800 active:shadow-none ' +
    'dark:bg-primary dark:hover:bg-primary-accent dark:shadow-none',
  secondary:
    'bg-gray-100 text-gray-800 shadow-btn ' +
    'hover:bg-gray-200 ' +
    'active:bg-gray-300 ' +
    'dark:bg-white/10 dark:text-text-primary dark:hover:bg-white/15 dark:shadow-none',
  outline:
    'border border-gray-200 bg-white text-gray-800 shadow-btn ' +
    'hover:bg-gray-50 hover:border-gray-300 ' +
    'active:bg-gray-100 ' +
    'dark:border-white/10 dark:bg-transparent dark:text-text-primary ' +
    'dark:hover:bg-white/5 dark:hover:border-white/20 dark:shadow-none',
  ghost:
    'text-gray-700 ' +
    'hover:bg-gray-100 hover:text-gray-900 ' +
    'active:bg-gray-200 ' +
    'dark:text-text-secondary dark:hover:bg-white/8 dark:hover:text-text-primary',
  danger:
    'bg-red-600 text-white shadow-btn ' +
    'hover:bg-red-700 hover:shadow-md ' +
    'active:bg-red-800 active:shadow-none ' +
    'dark:shadow-none',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base
        'inline-flex items-center justify-center font-semibold rounded-lg',
        'transition-all duration-150 ease-spring',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1',
        // Micro-interaction: lift on hover, press on active
        'hover:-translate-y-px active:translate-y-0 active:scale-[0.98]',
        // Disabled
        'disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
