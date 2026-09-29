import { useEffect, useState } from 'react';
import { CheckCircle2, Inbox, Mail, RotateCcw, Trash2 } from 'lucide-react';
import { Badge, Card, ConfirmDialog, EmptyState, PageSpinner } from '@/components/common';
import { supportApi, type SupportMessage } from '@/api/support.api';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

type Filter = 'open' | 'resolved' | 'all';

export function AdminSupportPage() {
  const [filter, setFilter] = useState<Filter>('open');
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const showLoader = useMinLoadTime(isLoading);
  const [refreshToken, setRefreshToken] = useState(0);
  const [deleting, setDeleting] = useState<SupportMessage | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    supportApi
      .list(filter === 'all' ? undefined : filter)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setOpenCount(result.openCount);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [filter, refreshToken]);

  async function setStatus(message: SupportMessage, status: 'open' | 'resolved') {
    await supportApi.setStatus(message.id, status);
    window.dispatchEvent(new Event('campus-coin:support-updated'));
    setRefreshToken((t) => t + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Support inbox</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Messages sent from the Help page. Reply by email, then mark them resolved.</p>
        </div>
        <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-white/[0.06]">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold capitalize', filter === f ? 'bg-white text-gray-900 shadow-sm dark:bg-surface-elevated dark:text-text-primary' : 'text-gray-500 dark:text-text-muted')}>
              {f}{f === 'open' && openCount > 0 ? ` (${openCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          open
          title="Delete this message?"
          description={`From ${deleting.name} (${deleting.email}). This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={async () => {
            await supportApi.remove(deleting.id);
            window.dispatchEvent(new Event('campus-coin:support-updated'));
            setRefreshToken((t) => t + 1);
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      {showLoader ? (
        <PageSpinner label="Loading messages…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title={filter === 'open' ? 'No open messages' : 'No messages'} description="Messages from the Help page contact form appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-text-primary">{m.name}</p>
                    <Badge tone={m.status === 'open' ? 'warning' : 'success'}>{m.status}</Badge>
                    <Badge tone="neutral">{m.topic}</Badge>
                    {m.userId && <Badge tone="info">Registered user</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-text-muted">{m.email} · {formatDate(m.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic} — Campus Coin support`)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent"
                  >
                    <Mail className="h-3.5 w-3.5" /> Reply
                  </a>
                  {m.status === 'open' ? (
                    <button type="button" onClick={() => void setStatus(m, 'resolved')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                    </button>
                  ) : (
                    <button type="button" onClick={() => void setStatus(m, 'open')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5">
                      <RotateCcw className="h-3.5 w-3.5" /> Reopen
                    </button>
                  )}
                  <button type="button" onClick={() => setDeleting(m)} aria-label={`Delete message from ${m.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-text-secondary">{m.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
