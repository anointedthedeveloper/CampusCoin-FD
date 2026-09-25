import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router doesn't reset scroll position on navigation the way a
 * full page load does, so without this a new route opens wherever the
 * previous one left the scrollbar.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // The site sets `scroll-behavior: smooth` globally for in-page anchor
    // links, but that also applies here — and combined with the sticky
    // header, the browser animates the reset over several hundred ms
    // instead of landing at the top immediately. Suspending the behavior
    // only takes effect once the browser has recomputed style, so force
    // that with a synchronous layout read before scrolling.
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    void root.offsetHeight;
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;
  }, [pathname]);

  return null;
}
