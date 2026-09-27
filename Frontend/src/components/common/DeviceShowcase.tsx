import { cn } from '@/utils/cn';
import { assets } from '@/assets/images';

interface DeviceShowcaseProps {
  screenshot: string;
  screenshotAlt: string;
  className?: string;
  /** Renders on a soft light blob backdrop instead of a dark panel. */
  tone?: 'light' | 'dark';
}

// Kept clear of the top-left (badge) and bottom-left (phone) corners.
const coins = [
  { className: 'right-[6%] top-[6%] h-9 w-9 [animation-delay:0s]', size: 'text-[10px]' },
  { className: 'right-[-2%] top-[42%] h-6 w-6 [animation-delay:0.6s]', size: 'text-[8px]' },
  { className: 'bottom-[10%] right-[16%] h-7 w-7 [animation-delay:1.2s]', size: 'text-[9px]' },
];

function Coin({ className, size }: { className: string; size: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute hidden animate-float items-center justify-center rounded-full bg-gradient-to-br from-[#f6d576] to-[#c98a1f] font-extrabold text-white shadow-lg ring-2 ring-white/40 sm:flex',
        className,
        size,
      )}
    >
      ₦
    </span>
  );
}

/**
 * A CSS-built laptop + phone mockup showing the real app screenshots — the
 * shared "device on a desk" composition used on the Features and About
 * heroes, standing in for a photographic product shot without needing a new
 * image asset.
 */
export function DeviceShowcase({ screenshot, screenshotAlt, className, tone = 'light' }: DeviceShowcaseProps) {
  return (
    <div className={cn('relative isolate px-4 py-10 sm:px-8', className)}>
      {tone === 'light' ? (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-[32px]" aria-hidden="true">
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-brand-200/50 blur-3xl dark:bg-primary/10" />
          <div className="absolute -bottom-10 left-0 h-56 w-56 rounded-full bg-brand-100/60 blur-3xl dark:bg-white/5" />
        </div>
      ) : (
        <div className="absolute inset-0 -z-10 rounded-[32px] bg-[#122a1f] dark:bg-surface-elevated" aria-hidden="true" />
      )}

      <Coin {...coins[0]} />
      <Coin {...coins[1]} />
      <Coin {...coins[2]} />

      <div className="relative mx-auto max-w-[440px]">
        {/* Laptop */}
        <div className="overflow-hidden rounded-t-xl border-[8px] border-b-0 border-neutral-800 bg-neutral-800 shadow-2xl">
          <img src={screenshot} alt={screenshotAlt} className="block aspect-[16/10.5] w-full object-cover object-top" />
        </div>
        <div className="relative mx-auto h-3.5 rounded-b-lg bg-gradient-to-b from-neutral-300 to-neutral-400 shadow-md" style={{ width: '104%', left: '-2%' }}>
          <span className="absolute left-1/2 top-0 h-1 w-14 -translate-x-1/2 rounded-b bg-neutral-500/60" />
        </div>

        {/* Phone, overlapping bottom-left */}
        <img
          src={assets.heroPhone}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 -left-8 w-24 drop-shadow-xl sm:w-28"
        />
      </div>
    </div>
  );
}
