import { adminAnnouncementsApi } from '@/api/admin/announcements.api';
import type { Announcement, AnnouncementAudience, AnnouncementPayload } from '@/types/admin';

export const adminAnnouncementService = {
  async list(): Promise<Announcement[]> {
    return adminAnnouncementsApi.list();
  },

  async listPublishedFor(_audience: Exclude<AnnouncementAudience, 'admins'>): Promise<Announcement[]> {
    const all = await adminAnnouncementsApi.list();
    return all.filter((a) => a.publishedAt && (a.audience === 'all' || a.audience === _audience));
  },

  async create(payload: AnnouncementPayload): Promise<Announcement> {
    return adminAnnouncementsApi.create(payload);
  },

  async update(id: string, payload: Partial<AnnouncementPayload>): Promise<Announcement> {
    return adminAnnouncementsApi.update(id, payload);
  },

  async remove(id: string): Promise<void> {
    return adminAnnouncementsApi.remove(id);
  },
};
