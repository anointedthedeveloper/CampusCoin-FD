import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';
import type { Announcement } from '@/types/admin';
import type { AppNotification } from '@/types/notification';

export const notificationsApi = {
  async list(): Promise<AppNotification[]> {
    const { data } = await httpClient.get<ApiSuccess<AppNotification[]>>('/notifications');
    return data.data ?? [];
  },

  // Student-safe feed of published announcements (the /admin/announcements
  // endpoint is admin-only and returns 403 for students).
  async listAnnouncements(): Promise<Announcement[]> {
    const { data } = await httpClient.get<ApiSuccess<Announcement[]>>('/notifications/announcements');
    return data.data ?? [];
  },

  async markAsRead(id: string): Promise<void> {
    await httpClient.patch(`/notifications/${id}/read`);
  },

  async clearAll(): Promise<void> {
    await httpClient.patch('/notifications/clear-all');
  },

  async markAllAsRead(): Promise<void> {
    await httpClient.patch('/notifications/read-all');
  },
};
