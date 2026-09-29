import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MessagesSquare } from 'lucide-react';
import { supportApi, type SupportMessage } from '@/api/support.api';
import { Badge, Card, Spinner } from '@/components/common';
import { SupportThread } from './SupportThread';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';

function preview(thread: SupportMessage) {
  const last = thread.messages[thread.messages.length - 1];
  return `${last.from === 'admin' ? 'Support: ' : 'You: '}${last.text}`;
}

/**
 * The signed-in student's support conversations with the Campus Coin team:
 * a list on the left and the open chat on the right (stacked on phones).
 * Polls while open so admin replies show up without a refresh.
 */
export function MyConversations({ refreshKey = 0, focusId }: { refreshKey?: number; focusId?: string | null }) {
  const [threads, setThreads] = useState<SupportMessage[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<SupportMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const { items } = await supportApi.myThreads();
      setThreads(items);
      setError(null);
    } catch {
      setError('Could not load your conversations.');
      setThreads((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList, refreshKey]);
  useEffect(() => { if (focusId) setActiveId(focusId); }, [focusId]);

  const loadActive = useCallback(async (id: string) => {
    try {
      const thread = await supportApi.myThread(id);
      setActive(thread);
      setThreads((prev) => prev?.map((t) => (t.id === id ? thread : t)) ?? prev);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setActiveId(null);
        setActive(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!activeId) { setActive(null); return undefined; }
    void loadActive(activeId);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadActive(activeId);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [activeId, loadActive]);

  if (threads === null) {
    return <div className="flex justify-center py-10"><Spinner /></div>;
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-white/10">
        <MessagesSquare className="h-8 w-8 text-gray-300 dark:text-text-muted" />
        <p className="font-semibold text-gray-800 dark:text-text-primary">No conversations yet</p>
        <p className="max-w-sm text-sm text-gray-500 dark:text-text-secondary">Send the team a message below — the whole conversation, including our replies, will show up here.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <ul className={cn('space-y-2', activeId && 'hidden lg:block')} aria-label="Your conversations">
        {threads.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setActiveId(t.id)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left transition',
                activeId === t.id
                  ? 'border-brand-300 bg-brand-50 dark:border-primary/40 dark:bg-primary/10'
                  : 'border-gray-200 bg-white hover:border-brand-200 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20',
              )}
            >
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{t.topic}</p>
                {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-primary-accent" aria-label="New reply" />}
                <Badge tone={t.status === 'open' ? 'warning' : 'success'} size="sm">{t.status}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-text-secondary">{preview(t)}</p>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-text-muted">{new Date(t.lastActivityAt).toLocaleString()}</p>
            </button>
          </li>
        ))}
      </ul>

      <Card className={cn('flex h-[min(560px,70vh)] flex-col p-4 sm:p-5', !activeId && 'hidden lg:flex')}>
        {active ? (
          <>
            <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-white/10">
              <button type="button" onClick={() => setActiveId(null)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-white/10" aria-label="Back to conversations">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900 dark:text-text-primary">{active.topic}</p>
                <p className="text-xs text-gray-500 dark:text-text-muted">Started {new Date(active.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <SupportThread
              className="min-h-0 flex-1"
              thread={active}
              viewer="user"
              onSend={async (text) => {
                try {
                  const updated = await supportApi.replyAsUser(active.id, text);
                  setActive(updated);
                  setThreads((prev) => [updated, ...(prev ?? []).filter((t) => t.id !== updated.id)]);
                } catch (err) {
                  throw new Error(err instanceof ApiError ? err.message : 'Could not send. Please try again.');
                }
              }}
            />
          </>
        ) : activeId ? (
          <div className="flex flex-1 items-center justify-center"><Spinner /></div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-text-secondary">
            <MessagesSquare className="h-8 w-8 text-gray-300 dark:text-text-muted" />
            Pick a conversation to read the replies.
          </div>
        )}
      </Card>
    </div>
  );
}
