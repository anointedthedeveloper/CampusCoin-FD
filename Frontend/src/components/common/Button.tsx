import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-brand-700/30 ' +
    'dark:bg-primary dark:shadow-black/30 dark:hover:bg-primary-accent',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white/10 dark:text-text-primary dark:hover:bg-white/15',
  outline:
    'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 ' +
    'dark:border-white/15 dark:bg-transparent dark:text-text-primary dark:hover:border-white/25 dark:hover:bg-white/5',
  ghost: 'text-gray-700 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/10',
  danger: 'bg-red-600 text-white shadow-md shadow-red-600/25 hover:bg-red-700 dark:shadow-black/30',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Please wait…',
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-wide',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98] active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
