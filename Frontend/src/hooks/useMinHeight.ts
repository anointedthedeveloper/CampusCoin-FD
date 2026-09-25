import { useEffect, useState } from 'react';

/** True while the given media query matches — re-evaluated live as the viewport changes. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : true));

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** True once the viewport is at least `px` tall. */
export function useMinHeight(px: number): boolean {
  return useMediaQuery(`(min-height: ${px}px)`);
}
