export type NotificationType =
  | 'budget-warning'
  | 'budget-exceeded'
  | 'budget-near'
  | 'insight-ready'
  | 'system'
  | 'announcement'
  | 'overspending'
  | 'allowance-exceeded'
  | 'goal-reached'
  | 'support-reply'
  | 'backup';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}
