import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full',
        'text-gray-700 transition-colors duration-300 hover:bg-black/5 active:scale-95',
        'dark:text-text-secondary dark:hover:bg-white/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-1',
        className,
      )}
    >
      <Sun
        aria-hidden="true"
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-300 ease-out',
          isDark ? '-translate-y-6 rotate-90 opacity-0' : 'translate-y-0 rotate-0 opacity-100',
        )}
      />
      <Moon
        aria-hidden="true"
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-300 ease-out',
          isDark ? 'translate-y-0 rotate-0 opacity-100' : 'translate-y-6 -rotate-90 opacity-0',
        )}
      />
    </button>
  );
}
