import type { CategoryType } from './category';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringEntry {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  type: CategoryType;
  description?: string;
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  lastRunAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringPayload {
  categoryId: string;
  amount: number;
  type: CategoryType;
  description?: string;
  frequency: RecurringFrequency;
  interval?: number;
  startDate: string;
  endDate?: string | null;
}
