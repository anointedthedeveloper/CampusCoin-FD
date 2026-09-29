import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Mail, X } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { reportsApi } from '@/api/reports.api';
import { ApiError } from '@/types/api';
import { isValidEmail } from '@/utils/validation';

/** Sends the month's PDF report by email — to yourself or someone you choose. */
export function EmailReportDialog({ month, monthLabel, defaultEmail, onClose }: { month: string; monthLabel: string; defaultEmail: string; onClose: () => void }) {
  const [to, setTo] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector('input')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(to.trim())) { setError('Enter a valid email address.'); return; }
    setSending(true);
    setError(null);
    try {
      setSent(await reportsApi.emailMonthly(month, to.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The report could not be emailed. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="email-report-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !sending && onClose()} />
      <div ref={panelRef} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 dark:bg-surface-elevated dark:ring-white/10">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
            <CheckCircle2 className="h-10 w-10 text-brand-600 dark:text-primary-accent" />
            <p className="font-semibold text-gray-900 dark:text-text-primary">{sent}</p>
            <p className="text-sm text-gray-500 dark:text-text-secondary">The PDF is attached to the email. Check spam if it doesn&apos;t arrive in a minute.</p>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent"><Mail className="h-4 w-4" /></span>
              <div>
                <h2 id="email-report-title" className="font-bold text-gray-900 dark:text-text-primary">Email the {monthLabel} report</h2>
                <p className="text-xs text-gray-500 dark:text-text-muted">Sent as a PDF — to yourself, a parent or a sponsor.</p>
              </div>
            </div>
            <Input label="Send to" type="email" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="email" />
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={sending}>Send report</Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
