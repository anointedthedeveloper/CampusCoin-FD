import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';
import type { Bookmark, BookmarkTargetType, Insight, SavingTip } from '@/types/insight';

export const insightsApi = {
  async listInsights(params?: { month?: string }): Promise<Insight[]> {
    const { data } = await httpClient.get<ApiSuccess<Insight[]>>('/insights', {
      params: params?.month ? { month: params.month } : undefined,
    });
    return data.data ?? [];
  },

  async listSavingTips(): Promise<SavingTip[]> {
    const { data } = await httpClient.get<ApiSuccess<SavingTip[]>>('/saving-tips');
    return data.data ?? [];
  },

  async listSavingTipsWithMeta(): Promise<{ tips: SavingTip[]; dismissedCount: number }> {
    const { data } = await httpClient.get<ApiSuccess<SavingTip[]> & { meta?: { dismissedCount?: number } }>('/saving-tips');
    return { tips: data.data ?? [], dismissedCount: data.meta?.dismissedCount ?? 0 };
  },

  async dismissSavingTip(tipId: string): Promise<void> {
    await httpClient.post('/saving-tips/dismiss', { tipId });
  },

  async pinSavingTip(tipId: string, pinned: boolean): Promise<void> {
    await httpClient.post('/saving-tips/pin', { tipId, pinned });
  },

  async restoreDismissedTips(): Promise<void> {
    await httpClient.post('/saving-tips/restore');
  },

  async listBookmarks(): Promise<Bookmark[]> {
    const { data } = await httpClient.get<ApiSuccess<Bookmark[]>>('/bookmarks');
    return data.data ?? [];
  },

  async addBookmark(payload: { targetType: BookmarkTargetType; targetId: string }): Promise<Bookmark> {
    const { data } = await httpClient.post<ApiSuccess<Bookmark>>('/bookmarks', payload);
    return data.data;
  },

  async removeBookmark(id: string): Promise<void> {
    await httpClient.delete(`/bookmarks/${id}`);
  },
};
