// Service layer over notificationsApi.

import { notificationsApi } from '@/api/notifications.api';
import type { AppNotification } from '@/types/notification';

/** Number of notifications not yet read. */
export function countUnread(list: AppNotification[]): number {
  return list.filter((n) => !n.isRead).length;
}

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    return notificationsApi.list();
  },

  async markAsRead(_userId: string, id: string): Promise<void> {
    await notificationsApi.markAsRead(id);
  },

  async markAllAsRead(_userId: string): Promise<void> {
    await notificationsApi.markAllAsRead();
  },

  countUnread,
};
