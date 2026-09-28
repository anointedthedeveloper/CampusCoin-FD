import { lazy, type ComponentType } from 'react';

const RELOAD_FLAG_KEY = 'campus-coin.chunk-reload-at';
const RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk|MIME type/i.test(
    message,
  );
}

/**
 * React.lazy with recovery for stale deployments. After a redeploy the old
 * hashed chunk files (e.g. InsightsPage-C0X7OOCg.js) no longer exist, so a
 * tab that was opened before the deploy fails to import them. Reloading the
 * page fetches the new index.html with the current chunk names. The reload
 * is rate-limited so a genuinely broken chunk surfaces in the ErrorBoundary
 * instead of looping forever.
 */
export function lazyWithRetry<T extends ComponentType<any>>( // eslint-disable-line @typescript-eslint/no-explicit-any
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;

      let lastReload = 0;
      try {
        lastReload = Number(sessionStorage.getItem(RELOAD_FLAG_KEY)) || 0;
      } catch {
        // sessionStorage unavailable — fall through to a single reload attempt.
      }

      if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
        try {
          sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
        } catch {
          // ignore
        }
        window.location.reload();
        // Keep Suspense showing its fallback until the reload takes over.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
