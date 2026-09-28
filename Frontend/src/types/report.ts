export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface MonthlyReport {
  month: string; // 'YYYY-MM'
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  categoryBreakdown: CategoryBreakdownItem[];
  /** Income grouped by source (income category). */
  incomeBreakdown?: CategoryBreakdownItem[];
  dailySpend: { date: string; amount: number }[];
  weeklySpend?: { weekStart: string; weekEnd: string; amount: number }[];
  transactionCount?: number;
  transactions?: ReportTransaction[];
}

export interface ReportTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId: string;
  categoryName: string;
  occurredAt: string;
}

export interface ReportFilters {
  startMonth?: string;
  endMonth?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  /** YYYY-MM-DD, within the report month */
  startDate?: string;
  endDate?: string;
}
