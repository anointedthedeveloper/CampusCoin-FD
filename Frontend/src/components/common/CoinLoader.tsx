import { useMediaQuery } from '@/hooks/useMinHeight';
import { cn } from '@/utils/cn';

/** A single spinning coin — the shared loading indicator (full-page loads, async waits). */
export function CoinLoader({ label = 'Loading…', className }: { label?: string; className?: string }) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative h-20 w-16" style={{ perspective: '320px' }} aria-hidden="true">
        <svg
          viewBox="0 0 64 64"
          className={cn('absolute left-1/2 top-0 h-14 w-14 -translate-x-1/2 drop-shadow-lg', !prefersReducedMotion && 'animate-coin-flip')}
        >
          <defs>
            <linearGradient id="coin-loader-face" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ee7a8" />
              <stop offset="55%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#0f5c30" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="29" fill="url(#coin-loader-face)" stroke="#0b3b20" strokeWidth="2" />
          <circle cx="32" cy="32" r="22" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
          <text x="32" y="41" textAnchor="middle" fontSize="25" fontWeight="800" fill="#ffffff" fontFamily="'Naira', 'Plus Jakarta Sans', sans-serif">
            ₦
          </text>
        </svg>
        <span
          className={cn(
            'absolute bottom-1 left-1/2 h-2 w-9 -translate-x-1/2 rounded-full bg-black/25 blur-[3px] dark:bg-black/60',
            !prefersReducedMotion && 'animate-coin-shadow',
          )}
        />
      </div>
      <p className="mt-3 text-sm font-extrabold tracking-[0.14em] text-text-primary">CAMPUS COIN</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </div>
  );
}
