import { CoinLoader } from '@/components/common/CoinLoader';

export function PageLoader() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-background px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading Campus Coin"
    >
      <CoinLoader label="Getting your campus wallet ready" />
    </main>
  );
}
