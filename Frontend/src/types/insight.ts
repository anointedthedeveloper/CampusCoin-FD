export type InsightKind = 'monthly-summary' | 'spending-alert' | 'saving-tip';

export interface Insight {
  id: string;
  userId: string;
  kind: InsightKind;
  title: string;
  body: string;
  month?: string; // relevant for 'monthly-summary'
  isAiGenerated: boolean;
  createdAt: string;
}

export interface SavingTip {
  id: string;
  title: string;
  body: string;
  category?: string;
  isAiGenerated: boolean;
  createdAt?: string;
  /** 'personal' = generated from the student's own records. */
  kind?: 'personal' | 'general';
  /** Estimated monthly saving used for ranking. */
  impact?: number;
  rank?: number;
  isPinned?: boolean;
}

export type BookmarkTargetType = 'insight' | 'saving-tip';

export interface Bookmark {
  id: string;
  userId: string;
  targetType: BookmarkTargetType;
  targetId: string;
  createdAt: string;
}
