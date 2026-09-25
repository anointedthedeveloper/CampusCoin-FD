import { cn } from '@/utils/cn';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  showTagline?: boolean;
}

export function Logo({
  className,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
  showTagline = false,
}: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.03]', className)}>
      <img
        src="/logo.png"
        alt="Campus Coin logo"
        className={cn('h-11 w-11 shrink-0 object-contain sm:h-14 sm:w-14', iconClassName)}
      />
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className={cn('text-lg font-extrabold tracking-tight text-brand-700', wordmarkClassName)}>
            CAMPUS COIN
          </span>
          {showTagline && (
            <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:block">
              Your Campus &middot; Your Wallet
            </span>
          )}
        </span>
      )}
    </span>
  );
}
