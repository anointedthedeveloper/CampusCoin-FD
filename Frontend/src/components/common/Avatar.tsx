import { cn } from '@/utils/cn';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : parts[0]?.slice(0, 2);
  return (initials ?? '?').toUpperCase();
}

/** Deterministic hue from name so each user gets a consistent colour */
function getHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-surface', sizeStyles[size], className)}
      />
    );
  }

  const hue = getHue(name);
  // Use CSS custom property so Tailwind JIT doesn't need to know about the dynamic value
  const style = {
    backgroundColor: `hsl(${hue}, 50%, 88%)`,
    color: `hsl(${hue}, 40%, 28%)`,
  };

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-white dark:ring-surface',
        sizeStyles[size],
        className,
      )}
      style={style}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
