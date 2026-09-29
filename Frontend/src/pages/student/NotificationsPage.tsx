import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellOff, Info, Megaphone, PartyPopper, Sparkles, Trash2, TrendingDown, Wallet } from 'lucide-react';
import { Card, ConfirmDialog, EmptyState, PageSpinner } from '@/components/common';
import { useNotifications } from '@/hooks/useNotifications';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { NotificationType } from '@/types/notification';

const typeConfig: Record<NotificationType, { icon: typeof Bell; iconCls: string; label?: string }> = {
  'budget-warning':     { icon: AlertTriangle, iconCls: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400', label: 'Budget' },
  'budget-near':        { icon: AlertTriangle, iconCls: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400', label: 'Budget' },
  'budget-exceeded':    { icon: AlertTriangle, iconCls: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400', label: 'Budget' },
  overspending:         { icon: TrendingDown,  iconCls: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400', label: 'Limit' },
  'allowance-exceeded': { icon: Wallet,        iconCls: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400', label: 'Limit' },
  'goal-reached':       { icon: PartyPopper,   iconCls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400', label: 'Goal' },
  'insight-ready':      { icon: Sparkles,      iconCls: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400' },
  announcement:         { icon: Megaphone,     iconCls: 'bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent', label: 'Announcement' },
  system:               { icon: Info,          iconCls: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400' },
};

export function NotificationsPage() {
  const { notifications, unreadCount, isLoading, fetchNotifications, markAllAsRead, clearAll } = useNotifications();
  const showLoader = useMinLoadTime(isLoading);
  const [confirmClear, setConfirmClear] = useState(false);
  // Which ones were unread when the page opened — kept highlighted for this
  // visit even though opening the page marks everything as read.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const markedOnOpen = useRef(false);

  useEffect(() => {
    void fetchNotifications(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading || markedOnOpen.current) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (!unread.length) return;
    markedOnOpen.current = true;
    setNewIds(new Set(unread.map((n) => n.id)));
    void markAllAsRead().catch(() => undefined);
  }, [isLoading, notifications, markAllAsRead]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Notifications</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            {newIds.size > 0 ? `${newIds.size} new since your last visit` : unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
          >
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
        )}
      </div>

      {confirmClear && (
        <ConfirmDialog
          open
          title="Clear all notifications?"
          description="They'll be removed from this list. Budget and limit alerts will still appear again if something new happens."
          confirmLabel="Clear all"
          onConfirm={clearAll}
          onClose={() => setConfirmClear(false)}
        />
      )}

      {showLoader ? (
        <PageSpinner label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications" description="Budget alerts, limit warnings and announcements from the Campus Coin team will show up here." />
      ) : (
        <Card noPadding>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {notifications.map((notif) => {
              const cfg = typeConfig[notif.type] ?? typeConfig.system;
              const Icon = cfg.icon;
              const isNew = newIds.has(notif.id) || !notif.isRead;
              return (
                <div key={notif.id} className={cn('flex items-start gap-4 px-4 py-4 sm:px-5', isNew && 'bg-brand-50/60 dark:bg-primary/[0.06]')}>
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cfg.iconCls)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{notif.title}</p>
                      {cfg.label && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-white/[0.08] dark:text-text-secondary">{cfg.label}</span>
                      )}
                      {isNew && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white dark:bg-primary">New</span>}
                    </div>
                    <p className="mt-0.5 whitespace-pre-line text-sm text-gray-600 dark:text-text-secondary">{notif.message}</p>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-text-muted">{formatDate(notif.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
