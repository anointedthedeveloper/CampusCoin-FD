import { insightsApi } from '@/api/insights.api';
import type { Insight } from '@/types/insight';

export interface MonthlyStats {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactionCount: number;
  topCategory: string | null;
  biggestIncreaseCategory: string | null;
  biggestIncreaseAmount: number;
  spendingTrend: 'up' | 'down' | 'flat';
  budgetsOnTrack: number;
  budgetsTotal: number;
}

export type HealthScoreLabel = 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';

export interface FinancialHealthSnapshot {
  label: HealthScoreLabel;
  description: string;
}

export const insightService = {
  async list(_userId?: string, month?: string): Promise<Insight[]> {
    return insightsApi.listInsights(month ? { month } : undefined);
  },

  // generateMonthlySummary is kept for call-site compatibility;
  // it now fetches insights from the backend instead of computing locally.
  async generateMonthlySummary(_userId?: string, month?: string): Promise<Insight | null> {
    const monthStr = month ?? new Date().toISOString().slice(0, 7);
    const insights = await insightsApi.listInsights({ month: monthStr });
    const summary = insights.find((i) => i.kind === 'monthly-summary');
    return summary ?? null;
  },

  // getMonthlyStats and getFinancialHealthSnapshot are computed server-side
  // in the reports/insights endpoints. These stubs keep old call-sites from
  // breaking while pages migrate to use the real data.
  getMonthlyStats(_userId: string, _month?: string): MonthlyStats {
    return {
      month: _month ?? new Date().toISOString().slice(0, 7),
      totalIncome: 0,
      totalExpense: 0,
      netSavings: 0,
      transactionCount: 0,
      topCategory: null,
      biggestIncreaseCategory: null,
      biggestIncreaseAmount: 0,
      spendingTrend: 'flat',
      budgetsOnTrack: 0,
      budgetsTotal: 0,
    };
  },

  getFinancialHealthSnapshot(_userId: string, _month?: string): FinancialHealthSnapshot {
    return { label: 'Fair', description: 'Loading financial health data…' };
  },
};
