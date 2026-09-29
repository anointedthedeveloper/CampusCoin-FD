import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Inbox, Mail, MessagesSquare, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Badge, Card, ConfirmDialog, EmptyState, PageSpinner, Spinner } from '@/components/common';
import { SupportThread } from '@/components/help/SupportThread';
import { supportApi, type SupportMessage } from '@/api/support.api';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';

type Filter = 'open' | 'resolved' | 'all';

function announceChange() {
  window.dispatchEvent(new Event('campus-coin:support-updated'));
}

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function AdminSupportPage() {
  const [filter, setFilter] = useState<Filter>('open');
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [counts, setCounts] = useState({ open: 0, unread: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const showLoader = useMinLoadTime(isLoading);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<SupportMessage | null>(null);
  const [deleting, setDeleting] = useState<SupportMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resolveOnSend, setResolveOnSend] = useState(false);

  const loadList = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const result = await supportApi.list(filter === 'all' ? undefined : filter);
      setItems(result.items);
      setCounts({ open: result.openCount, unread: result.unreadCount });
    } catch {
      if (!quiet) setItems([]);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => { void loadList(); }, [loadList]);

  // New messages from students show up without a refresh.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadList(true);
      if (activeId) supportApi.get(activeId).then(setActive).catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [loadList, activeId]);

  useEffect(() => {
    if (!activeId) { setActive(null); return; }
    let cancelled = false;
    setActive(null);
    supportApi.get(activeId)
      .then((thread) => {
        if (cancelled) return;
        setActive(thread);
        setItems((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
        announceChange();
      })
      .catch(() => { if (!cancelled) setActiveId(null); });
    return () => { cancelled = true; };
  }, [activeId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function setStatus(message: SupportMessage, status: 'open' | 'resolved') {
    await supportApi.setStatus(message.id, status);
    announceChange();
    if (active?.id === message.id) setActive({ ...message, status });
    void loadList(true);
  }

  const q = search.trim().toLowerCase();
  const visible = q
    ? items.filter((m) => [m.name, m.email, m.topic, ...m.messages.map((x) => x.text)].some((v) => v.toLowerCase().includes(q)))
    : items;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Support inbox</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
            Chat with students who wrote in from the Help page. Replies reach them in the app and by email.
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-white/[0.06]">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button key={f} type="button" onClick={() => { setFilter(f); setActiveId(null); }} className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold capitalize', filter === f ? 'bg-white text-gray-900 shadow-sm dark:bg-surface-elevated dark:text-text-primary' : 'text-gray-500 dark:text-text-muted')}>
              {f}{f === 'open' && counts.open > 0 ? ` (${counts.open})` : ''}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800 dark:border-primary/30 dark:bg-primary/10 dark:text-primary-accent">{notice}</div>
      )}

      {deleting && (
        <ConfirmDialog
          open
          title="Delete this conversation?"
          description={`From ${deleting.name} (${deleting.email}). The whole conversation is removed and cannot be recovered.`}
          confirmLabel="Delete"
          onConfirm={async () => {
            await supportApi.remove(deleting.id);
            announceChange();
            if (activeId === deleting.id) setActiveId(null);
            void loadList(true);
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      {showLoader ? (
        <PageSpinner label="Loading messages…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title={filter === 'open' ? 'No open conversations' : 'No conversations'} description="Messages from the Help page contact form appear here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Conversation list */}
          <Card noPadding className={cn('flex max-h-[calc(100vh-220px)] min-h-[420px] flex-col', activeId && 'hidden lg:flex')}>
            <div className="border-b border-gray-100 p-3 dark:border-white/10">
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or text" aria-label="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-text-primary" />
              </label>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-white/[0.06]">
              {visible.map((m) => {
                const last = m.messages[m.messages.length - 1];
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(m.id)}
                      className={cn('w-full px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.04]', activeId === m.id && 'bg-brand-50 dark:bg-primary/10')}
                    >
                      <div className="flex items-center gap-2">
                        {m.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-primary-accent" aria-label="Unread" />}
                        <p className={cn('min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-text-primary', m.unread ? 'font-bold' : 'font-semibold')}>{m.name}</p>
                        <span className="shrink-0 text-[11px] text-gray-400 dark:text-text-muted">{relative(m.lastActivityAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge tone={m.status === 'open' ? 'warning' : 'success'} size="sm">{m.status}</Badge>
                        <span className="truncate text-xs text-gray-500 dark:text-text-secondary">{m.topic}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-text-muted">{last.from === 'admin' ? 'You: ' : ''}{last.text}</p>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-500">No conversations match “{search}”.</li>}
            </ul>
          </Card>

          {/* Open conversation */}
          <Card className={cn('flex h-[calc(100vh-220px)] min-h-[420px] flex-col p-4 sm:p-5', !activeId && 'hidden lg:flex')}>
            {active ? (
              <>
                <div className="flex flex-wrap items-start gap-2 border-b border-gray-100 pb-3 dark:border-white/10">
                  <button type="button" onClick={() => setActiveId(null)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-white/10" aria-label="Back to inbox">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-text-primary">{active.name}</p>
                      <Badge tone={active.status === 'open' ? 'warning' : 'success'}>{active.status}</Badge>
                      <Badge tone="neutral">{active.topic}</Badge>
                      {active.userId ? <Badge tone="info">Registered user</Badge> : <Badge tone="neutral">Guest — replies by email</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-text-muted">{active.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={`mailto:${active.email}?subject=${encodeURIComponent(`Re: ${active.topic} — Campus Coin support`)}`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-text-muted dark:hover:bg-white/10" aria-label="Email directly" title="Email directly">
                      <Mail className="h-4 w-4" />
                    </a>
                    {active.status === 'open' ? (
                      <button type="button" onClick={() => void setStatus(active, 'resolved')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                      </button>
                    ) : (
                      <button type="button" onClick={() => void setStatus(active, 'open')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5">
                        <RotateCcw className="h-3.5 w-3.5" /> Reopen
                      </button>
                    )}
                    <button type="button" onClick={() => setDeleting(active)} aria-label={`Delete conversation with ${active.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <SupportThread
                  className="min-h-0 flex-1"
                  thread={active}
                  viewer="admin"
                  onSend={async (text) => {
                    try {
                      const result = await supportApi.reply(active.id, text, resolveOnSend);
                      setActive(result.thread);
                      setItems((prev) => prev.map((t) => (t.id === result.thread.id ? result.thread : t)));
                      setNotice(
                        result.inApp
                          ? `Reply sent — ${active.name} will see it in the app${result.emailed ? ' and by email' : ''}.`
                          : result.emailed ? `Reply emailed to ${active.email}.` : 'Reply saved, but email is not configured so the guest was not notified. Use the mail icon to email them.',
                      );
                      setResolveOnSend(false);
                      announceChange();
                    } catch (err) {
                      throw new Error(err instanceof ApiError ? err.message : 'Could not send the reply.');
                    }
                  }}
                  footer={
                    <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-text-secondary">
                      <input type="checkbox" checked={resolveOnSend} onChange={(e) => setResolveOnSend(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      Mark resolved when sent
                    </label>
                  }
                />
              </>
            ) : activeId ? (
              <div className="flex flex-1 items-center justify-center"><Spinner /></div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-text-secondary">
                <MessagesSquare className="h-9 w-9 text-gray-300 dark:text-text-muted" />
                Select a conversation to read and reply.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
