import { cn } from '@/utils/cn';

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

/** Renders the expanding circles spawned by `useRipple`. Parent needs `relative overflow-hidden`. */
export function Ripple({ ripples, className }: { ripples: RippleItem[]; className?: string }) {
  return (
    <>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden="true"
          className={cn('pointer-events-none absolute rounded-full animate-ripple', className)}
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
        />
      ))}
    </>
  );
}
