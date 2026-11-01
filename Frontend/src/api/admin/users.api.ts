// Admin user-management endpoints, plus the saving-tip template endpoints.

import { httpClient } from '../httpClient';
import type { ApiSuccess, PaginatedResult } from '@/types/api';
import type { AdminUserDetail, AdminUserSummary, SavingTipTemplate } from '@/types/admin';

export interface AdminUserFilters {
  search?: string;
  role?: 'student' | 'admin';
  page?: number;
  pageSize?: number;
}

export const adminUsersApi = {
  async list(filters: AdminUserFilters = {}): Promise<PaginatedResult<AdminUserSummary>> {
    const { data } = await httpClient.get<ApiSuccess<PaginatedResult<AdminUserSummary>>>(
      '/admin/users',
      { params: filters },
    );
    return data.data;
  },

  async getById(id: string): Promise<AdminUserDetail> {
    const { data } = await httpClient.get<ApiSuccess<AdminUserDetail>>(`/admin/users/${id}`);
    return data.data;
  },

  async update(id: string, payload: { role?: 'student' | 'admin'; fullName?: string; school?: string; academicYear?: string }): Promise<AdminUserSummary> {
    const { data } = await httpClient.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}`, payload);
    return data.data;
  },

  async sendPasswordReset(id: string): Promise<string> {
    const { data } = await httpClient.post<ApiSuccess<null>>(`/admin/users/${id}/send-password-reset`);
    return data.message ?? 'Password reset email sent.';
  },

  /** Wipes the student's financial data and restarts onboarding; their login is kept. */
  async resetAccount(id: string): Promise<AdminUserSummary> {
    const { data } = await httpClient.post<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}/reset`);
    return data.data;
  },

  /** Suspends (false) or reactivates (true) an account. */
  async setActive(id: string, isActive: boolean): Promise<AdminUserSummary> {
    const { data } = await httpClient.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}`, {
      isActive,
    });
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/admin/users/${id}`);
  },
};

export const adminSavingTipsApi = {
  async list(): Promise<SavingTipTemplate[]> {
    const { data } = await httpClient.get<ApiSuccess<SavingTipTemplate[]>>('/admin/saving-tips');
    return data.data ?? [];
  },

  async create(payload: { title: string; body: string; category?: string }): Promise<SavingTipTemplate> {
    const { data } = await httpClient.post<ApiSuccess<SavingTipTemplate>>('/admin/saving-tips', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<{ title: string; body: string; category: string }>): Promise<SavingTipTemplate> {
    const { data } = await httpClient.patch<ApiSuccess<SavingTipTemplate>>(`/admin/saving-tips/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/admin/saving-tips/${id}`);
  },
};
