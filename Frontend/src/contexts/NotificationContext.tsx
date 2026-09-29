import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { notificationService } from '@/services';
import { notificationsApi } from '@/api/notifications.api';
import type { AppNotification } from '@/types/notification';
import { useAuth } from '@/hooks/useAuth';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (silent?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!isAuthenticated || !user) return;
    if (!silent) setIsLoading(true);
    try {
      const list = await notificationService.list();
      setNotifications(list);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      void fetchNotifications();
    } else {
      setNotifications([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Poll quietly (and on tab focus) so admin announcements and new alerts
  // appear on the bell without a page reload.
  useEffect(() => {
    if (!isAuthenticated || !user) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible') void fetchNotifications(true);
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [isAuthenticated, user?.id, fetchNotifications]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return;
      await notificationService.markAsRead(user.id, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    },
    [user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await notificationsApi.clearAll();
    setNotifications([]);
  }, [user]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notificationService.countUnread(notifications),
      isLoading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, clearAll],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
