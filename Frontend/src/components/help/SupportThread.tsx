import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send, ShieldCheck, UserRound } from 'lucide-react';
import type { SupportMessage } from '@/api/support.api';
import { Badge } from '@/components/common';
import { cn } from '@/utils/cn';

interface SupportThreadProps {
  thread: SupportMessage;
  /** Which side of the conversation the viewer is on. */
  viewer: 'user' | 'admin';
  onSend: (text: string) => Promise<void>;
  /** Optional extra controls under the composer (e.g. "Send & resolve"). */
  footer?: React.ReactNode;
  className?: string;
}

function timeLabel(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** A support conversation as chat bubbles, with a reply box. */
export function SupportThread({ thread, viewer, onSend, footer, className }: SupportThreadProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.messages.length, thread.id]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2" aria-live="polite">
        {thread.messages.map((m) => {
          const mine = m.from === viewer;
          return (
            <div key={m.id} className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}>
              {!mine && (
                <span className={cn('mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', m.from === 'admin' ? 'bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-text-secondary')}>
                  {m.from === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                </span>
              )}
              <div className={cn('max-w-[85%] sm:max-w-[75%]', mine && 'text-right')}>
                <p className="mb-1 px-1 text-[11px] text-gray-400 dark:text-text-muted">
                  {mine ? 'You' : m.authorName} · {timeLabel(m.createdAt)}
                </p>
                <div
                  className={cn(
                    'inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed',
                    mine
                      ? 'rounded-br-md bg-brand-600 text-white dark:bg-primary'
                      : 'rounded-bl-md border border-gray-200 bg-white text-gray-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-text-primary',
                  )}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        {thread.status === 'resolved' && (
          <div className="flex justify-center pt-1">
            <Badge tone="success">Marked resolved{viewer === 'user' ? ' — reply to reopen' : ''}</Badge>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-3 border-t border-gray-100 pt-3 dark:border-white/10">
        <label htmlFor={`reply-${thread.id}`} className="sr-only">Your reply</label>
        <div className="flex items-end gap-2">
          <textarea
            id={`reply-${thread.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={viewer === 'admin' ? `Reply to ${thread.name}…` : 'Write a reply…'}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-text-primary"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send reply"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-accent"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400 dark:text-text-muted">Enter to send · Shift+Enter for a new line</p>
          {footer}
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </div>
  );
}
