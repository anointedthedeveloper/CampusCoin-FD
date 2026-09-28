import { useTawkToVisibility } from '@/hooks/useTawkTo';

/**
 * Renders nothing — just runs useTawkToVisibility(), which needs the
 * current route and so must live inside the router (see ScrollToTop for
 * the same pattern).
 */
export function TawkToVisibility() {
  useTawkToVisibility();
  return null;
}
