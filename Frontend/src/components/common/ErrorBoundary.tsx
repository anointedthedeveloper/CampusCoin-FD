import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(
      error.message,
    )
  );
}

interface Props {
  children: ReactNode;
  /** Optional label shown in the error card heading */
  label?: string;
  /** When this value changes, a caught error is cleared (e.g. the route path). */
  resetKey?: unknown;
}

interface State {
  error: Error | null;
}

/**
 * Class-based error boundary (React still requires class components for this).
 *
 * Catches:
 *  - Lazy-loaded chunk fetch failures  (Failed to fetch dynamically imported module)
 *  - Runtime render errors in any child page
 *
 * Recovery: the "Try again" button resets state so React re-mounts the subtree,
 * which re-triggers the lazy import and usually succeeds on a retry.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    const error = this.state.error;
    if (error && isChunkLoadError(error)) {
      // The old chunk is gone after a redeploy; only a full reload fetches
      // the new index.html with the current chunk names.
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isChunkError = isChunkLoadError(this.state.error);

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-7 w-7" />
        </span>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary">
            {isChunkError ? 'Failed to load this page' : 'Something went wrong'}
          </h2>
          <p className="max-w-sm text-sm text-gray-500 dark:text-text-secondary">
            {isChunkError
              ? 'A newer version of Campus Coin may have been released. Reload to get the latest version.'
              : 'An unexpected error occurred while rendering this page.'}
          </p>
          {!isChunkError && (
            <p className="mt-2 max-w-sm rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500 dark:bg-white/[0.06] dark:text-text-muted">
              {this.state.error.message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={this.handleReset}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }
}
