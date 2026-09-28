import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  /** When set, the confirm button stays disabled until this exact text is typed. */
  requireText?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** Accessible confirmation modal for destructive or important actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  requireText,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    setTyped('');
    setError(null);
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isWorking) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canConfirm = !isWorking && (!requireText || typed.trim() === requireText);

  async function handleConfirm() {
    setIsWorking(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsWorking(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !isWorking && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-elevated"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              tone === 'danger'
                ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                : 'bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-gray-900 dark:text-text-primary">
              {title}
            </h2>
            <div className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">{description}</div>
          </div>
        </div>

        {requireText && (
          <label className="mt-4 block text-xs font-medium text-gray-600 dark:text-text-secondary">
            Type <span className="font-mono font-semibold text-gray-900 dark:text-text-primary">{requireText}</span> to confirm
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-white/10 dark:bg-surface dark:text-text-primary"
              autoComplete="off"
            />
          </label>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50',
              tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent',
            )}
          >
            {isWorking ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
