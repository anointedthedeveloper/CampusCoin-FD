import { insightsApi } from '@/api/insights.api';
import type { SavingTip, Bookmark } from '@/types/insight';

export const tipsService = {
  async list(_userId?: string, _month?: string): Promise<SavingTip[]> {
    return insightsApi.listSavingTips();
  },

  // Dismiss is not yet a backend feature — no-op.
  dismiss(_userId: string, _ruleId: string): void {
    return;
  },

  async isBookmarked(_userId: string, tipId: string): Promise<boolean> {
    const bookmarks = await insightsApi.listBookmarks();
    return bookmarks.some((b: Bookmark) => b.targetId === tipId && b.targetType === 'saving-tip');
  },

  async toggleBookmark(_userId: string, tipId: string): Promise<boolean> {
    const bookmarks = await insightsApi.listBookmarks();
    const existing = bookmarks.find((b: Bookmark) => b.targetId === tipId && b.targetType === 'saving-tip');
    if (existing) {
      await insightsApi.removeBookmark(existing.id);
      return false;
    }
    await insightsApi.addBookmark({ targetType: 'saving-tip', targetId: tipId });
    return true;
  },

  async listBookmarked(_userId?: string, _month?: string): Promise<SavingTip[]> {
    const [tips, bookmarks] = await Promise.all([insightsApi.listSavingTips(), insightsApi.listBookmarks()]);
    const bookmarkedIds = new Set(bookmarks.filter((b: Bookmark) => b.targetType === 'saving-tip').map((b: Bookmark) => b.targetId));
    return tips.filter((t: SavingTip) => bookmarkedIds.has(t.id));
  },

  deleteAllForUser(_userId: string): void {
    return;
  },
};
