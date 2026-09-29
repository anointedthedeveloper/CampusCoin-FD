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

  /** Emails the month's PDF to the student, or to `to` (e.g. a parent). */
  async emailMonthly(month: string, to?: string): Promise<string> {
    const { data } = await httpClient.post<ApiSuccess<{ to: string }> & { message?: string }>(
      '/reports/monthly/email',
      { month, ...(to ? { to } : {}) },
      { timeout: 45000 },
    );
    return data.message ?? `Report sent to ${data.data.to}.`;
  },
};
