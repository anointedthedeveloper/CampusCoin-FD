import { adminStatisticsApi } from '@/api/admin/statistics.api';
import type { SystemStatistics } from '@/types/admin';

export const adminStatisticsService = {
  async getStatistics(): Promise<SystemStatistics> {
    return adminStatisticsApi.getOverview();
  },
};
