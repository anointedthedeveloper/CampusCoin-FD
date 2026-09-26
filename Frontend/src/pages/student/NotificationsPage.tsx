import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, BellOff, Info, Megaphone, Sparkles } from 'lucide-react';
import { Card, EmptyState, Spinner } from '@/components/common';
import { useNotifications } from '@/hooks/useNotifications';
import { adminAnnouncementService } from '@/services';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Announcement } from '@/types/admin';
import type { NotificationType } from '@/types/notification';

const typeStyle: Record<NotificationType, { icon: typeof Bell; badgeClassName: string }> = {
  'budget-warning': { icon: AlertTriangle, badgeClassName: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400' },
  'budget-exceeded': { icon: AlertTriangle, badgeClassName: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  'insight-ready': { icon: Sparkles, badgeClassName: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400' },
  system: { icon: Info, badgeClassName: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400' },
};

export function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    void adminAnnouncementService.listPublishedFor('students').then(setAnnouncements);
  }, []);

  const hasAny = notifications.length > 0 || announcements.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent dark:hover:text-primary"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : !hasAny ? (
        <EmptyState icon={BellOff} title="No notifications" description="Budget alerts and insights will show up here." />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="flex items-start gap-3 px-5 py-4 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-primary-accent">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{announcement.title}</p>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-primary-accent/15 dark:text-primary-accent">
                      Announcement
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-text-secondary">{announcement.body}</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-text-muted">{formatDate(announcement.publishedAt ?? announcement.createdAt)}</p>
                </div>
              </div>
            ))}
            {notifications.map((notification) => {
              const { icon: Icon, badgeClassName } = typeStyle[notification.type];
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markAsRead(notification.id)}
                  className={cn(
                    'flex w-full items-start gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/5',
                    !notification.isRead && 'bg-brand-50/60 dark:bg-primary-accent/10',
                  )}
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', badgeClassName)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{notification.title}</p>
                      {!notification.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-primary-accent" />}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-text-secondary">{notification.message}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-text-muted">{formatDate(notification.createdAt)}</p>
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
