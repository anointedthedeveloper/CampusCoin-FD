import { useMemo } from 'react';
import { useMediaQuery } from '@/hooks/useMinHeight';
import { cn } from '@/utils/cn';

interface Coin {
  id: number;
  tone: 'green' | 'gold';
  left: number;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
  staticTop: number;
}

const COIN_COUNT = 14;

function makeCoins(): Coin[] {
  return Array.from({ length: COIN_COUNT }, (_, id) => ({
    id,
    tone: id % 3 === 0 ? 'gold' : 'green',
    left: 4 + Math.random() * 92,
    size: 10 + Math.random() * 12,
    duration: 1.8 + Math.random() * 2,
    delay: Math.random() * -4,
    rotate: (Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 220),
    staticTop: 6 + Math.random() * 78,
  }));
}

export function CoinLoader({ label = 'Loading…', className }: { label?: string; className?: string }) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const coins = useMemo(makeCoins, []);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative h-32 w-40 overflow-hidden" aria-hidden="true">
        {coins.map((coin) => (
          <span
            key={coin.id}
            className={cn('coin-rain-coin', coin.tone === 'gold' ? 'coin-rain-coin--gold' : 'coin-rain-coin--green')}
            style={
              prefersReducedMotion
                ? ({
                    '--coin-left': `${coin.left}%`,
                    '--coin-size': `${coin.size}px`,
                    top: `${coin.staticTop}%`,
                    animation: 'none',
                  } as React.CSSProperties)
                : ({
                    '--coin-left': `${coin.left}%`,
                    '--coin-size': `${coin.size}px`,
                    '--coin-duration': `${coin.duration}s`,
                    '--coin-delay': `${coin.delay}s`,
                    '--coin-rotate': `${coin.rotate}deg`,
                  } as React.CSSProperties)
            }
          />
        ))}
      </div>
      <p className="-mt-2 text-sm font-extrabold tracking-[0.14em] text-text-primary">CAMPUS COIN</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </div>
  );
}
