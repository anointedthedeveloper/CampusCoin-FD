import type { User } from './user';

export interface AdminUserSummary extends User {
  transactionCount: number;
  isActive: boolean;
}

export interface AdminRecentTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryName: string;
  occurredAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  categoryCount?: number;
  budgetCount?: number;
  totalIncome?: number;
  totalExpense?: number;
  recentTransactions?: AdminRecentTransaction[];
}

export interface SavingTipTemplate {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryUsage {
  name: string;
  type: 'income' | 'expense';
  transactionCount: number;
  totalAmount: number;
}

export type AnnouncementAudience = 'all' | 'students' | 'admins';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishNow?: boolean;
}

export interface SystemStatistics {
  totalUsers: number;
  activeUsersLast30Days: number;
  totalTransactions: number;
  totalCategories: number;
  averageMonthlySpendPerUser: number;
  suspendedUsers?: number;
  newUsersLast30Days?: number;
  incomeTransactions?: number;
  expenseTransactions?: number;
  mostUsedCategories?: CategoryUsage[];
  generatedAt: string;
}
