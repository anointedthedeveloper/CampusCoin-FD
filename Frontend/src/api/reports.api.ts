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

  /** The server-rendered PDF of a month's report. */
  async downloadMonthlyPdf(month: string): Promise<Blob> {
    const { data } = await httpClient.get<Blob>('/reports/monthly/pdf', {
      params: { month },
      responseType: 'blob',
      timeout: 30000,
    });
    return data;
  },
};
