import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';
import type { MonthlyReport, ReportFilters } from '@/types/report';

export const reportsApi = {
  async getMonthlyReport(params: { month?: string } & ReportFilters = {}): Promise<MonthlyReport> {
    const { month, ...filters } = params;
    const { data } = await httpClient.get<ApiSuccess<MonthlyReport>>('/reports/monthly', {
      params: { month: month ?? new Date().toISOString().slice(0, 7), ...filters },
    });
    return data.data;
  },
};
