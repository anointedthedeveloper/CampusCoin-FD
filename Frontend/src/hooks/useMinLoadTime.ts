import { useEffect, useRef, useState } from 'react';

/**
 * Returns `true` while EITHER `isLoading` is true OR the minimum display
 * duration hasn't elapsed yet — whichever is longer.
 *
 * This prevents the coin loader from flashing for just a few frames and
 * immediately disappearing, which feels broken. By guaranteeing a minimum
 * visible duration the transition always feels intentional.
 *
 * @param isLoading  The real loading flag from your data-fetch
 * @param minMs      Minimum time (ms) to show the loader — default 3000
 */
export function useMinLoadTime(isLoading: boolean, minMs = 3000): boolean {
  // Track whether the minimum time has elapsed since loading began
  const [minElapsed, setMinElapsed] = useState(!isLoading);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we've ever started a load so we skip the delay on the
  // very first render when isLoading is already false (page navigations that
  // land on pre-cached data should not sit frozen for 3 s).
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      // A new load started — reset the gate and start the minimum timer
      hasLoadedRef.current = true;
      setMinElapsed(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMinElapsed(true), minMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, minMs]);

  // Show the loader if the real load is still running OR the minimum hasn't elapsed
  return isLoading || !minElapsed;
}
