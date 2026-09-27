import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, BellOff, CheckCheck, Info, Megaphone, Sparkles } from 'lucide-react';
import { Card, EmptyState, PageSpinner } from '@/components/common';
import { useNotifications } from '@/hooks/useNotifications';
import { adminAnnouncementService } from '@/services';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Announcement } from '@/types/admin';
import type { NotificationType } from '@/types/notification';

const typeConfig: Record<NotificationType, {
  icon: typeof Bell;
  iconCls: string;
}> = {
  'budget-warning':  { icon: AlertTriangle, iconCls: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400' },
  'budget-exceeded': { icon: AlertTriangle, iconCls: 'bg-red-100   text-red-600   dark:bg-red-500/15   dark:text-red-400' },
  'budget-near':     { icon: AlertTriangle, iconCls: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400' },
  'insight-ready':   { icon: Sparkles,      iconCls: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400' },
  system:            { icon: Info,          iconCls: 'bg-blue-100  text-blue-600   dark:bg-blue-400/15  dark:text-blue-400' },
};

export function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    void adminAnnouncementService.listPublishedFor('students').then(setAnnouncements);
  }, []);

  const hasAny = notifications.length > 0 || announcements.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Notifications</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:bg-gray-50 hover:-translate-y-px dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !hasAny ? (
        <EmptyState
          icon={BellOff}
          title="No notifications"
          description="Budget alerts, insights, and announcements will show up here."
        />
      ) : (
        <Card noPadding>
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {/* Announcements */}
            {announcements.map((ann) => (
              <div key={ann.id} className="flex items-start gap-4 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{ann.title}</p>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-brand-600 dark:bg-primary/10 dark:text-primary-accent">
                      Announcement
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">{ann.body}</p>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-text-muted">
                    {formatDate(ann.publishedAt ?? ann.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {/* Notifications */}
            {notifications.map((notif) => {
              const cfg = typeConfig[notif.type] ?? typeConfig.system;
              const Icon = cfg.icon;
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => void markAsRead(notif.id)}
                  className={cn(
                    'flex w-full items-start gap-4 px-5 py-4 text-left',
                    'transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]',
                    !notif.isRead && 'bg-brand-50/50 dark:bg-primary/[0.06]',
                  )}
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cfg.iconCls)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-primary-accent" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">{notif.message}</p>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-text-muted">{formatDate(notif.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
