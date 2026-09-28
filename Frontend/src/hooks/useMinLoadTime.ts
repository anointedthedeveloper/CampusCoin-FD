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
 * @param minMs      Minimum time (ms) to show the loader — default 800
 */
export function useMinLoadTime(isLoading: boolean, minMs = 800): boolean {
  const [minElapsed, setMinElapsed] = useState(!isLoading);
  const startedAtRef = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      // A new load started — reset the gate and remember when it began.
      if (startedAtRef.current === null) startedAtRef.current = Date.now();
      setMinElapsed(false);
      return undefined;
    }

    // Load finished: wait only for whatever is left of the minimum window.
    // (Previously the timer was cleared as soon as isLoading flipped to
    // false, so any request faster than minMs left the loader up forever.)
    const startedAt = startedAtRef.current;
    startedAtRef.current = null;
    const remaining = startedAt === null ? 0 : minMs - (Date.now() - startedAt);
    if (remaining <= 0) {
      setMinElapsed(true);
      return undefined;
    }
    const timer = setTimeout(() => setMinElapsed(true), remaining);
    return () => clearTimeout(timer);
  }, [isLoading, minMs]);

  return isLoading || !minElapsed;
}
