import { reportsApi } from '@/api/reports.api';
import type { MonthlyReport, ReportFilters } from '@/types/report';

export interface TrendPoint {
  month: string;
  income: number;
  expenses: number;
}

export const reportService = {
  async getMonthlyReport(_userId?: string, month?: string, filters: ReportFilters = {}): Promise<MonthlyReport> {
    return reportsApi.getMonthlyReport({ month: month ?? new Date().toISOString().slice(0, 7), ...filters });
  },

  async getSixMonthTrend(_userId?: string, endMonth?: string): Promise<TrendPoint[]> {
    const end = endMonth ?? new Date().toISOString().slice(0, 7);
    const months: string[] = [];
    let cursor = new Date(`${end}-01`);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    const reports = await Promise.all(months.map((m) => reportsApi.getMonthlyReport({ month: m }).catch(() => null)));
    return months.map((m, i) => ({
      month: m,
      income: reports[i]?.totalIncome ?? 0,
      expenses: reports[i]?.totalExpense ?? 0,
    }));
  },

  toChartData(report: MonthlyReport) {
    return report.categoryBreakdown.map((item) => ({
      name: item.categoryName,
      value: item.amount,
      percentage: item.percentage,
    }));
  },
};
