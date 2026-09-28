import { insightsApi } from '@/api/insights.api';
import type { SavingTip } from '@/types/insight';

// Tips come from the server's saving-tips engine: personalised tips ranked by
// how much they could save, followed by the admin's general templates.
// "Bookmarking" a tip pins it; dismissing hides it until restored.
export const tipsService = {
  async list(_userId?: string, _month?: string): Promise<SavingTip[]> {
    return insightsApi.listSavingTips();
  },

  async listWithMeta(): Promise<{ tips: SavingTip[]; dismissedCount: number }> {
    return insightsApi.listSavingTipsWithMeta();
  },

  async dismiss(_userId: string, tipId: string): Promise<void> {
    await insightsApi.dismissSavingTip(tipId);
  },

  async restoreDismissed(): Promise<void> {
    await insightsApi.restoreDismissedTips();
  },

  async isBookmarked(_userId: string, tipId: string): Promise<boolean> {
    const tips = await insightsApi.listSavingTips();
    return Boolean(tips.find((t) => t.id === tipId)?.isPinned);
  },

  /** Toggles the pin; resolves to the new pinned state. */
  async toggleBookmark(_userId: string, tipId: string, currentlyPinned?: boolean): Promise<boolean> {
    const pinned = currentlyPinned ?? (await this.isBookmarked(_userId, tipId));
    await insightsApi.pinSavingTip(tipId, !pinned);
    return !pinned;
  },

  async listBookmarked(_userId?: string, _month?: string): Promise<SavingTip[]> {
    const tips = await insightsApi.listSavingTips();
    return tips.filter((t) => t.isPinned);
  },

  deleteAllForUser(_userId: string): void {
    return;
  },
};
