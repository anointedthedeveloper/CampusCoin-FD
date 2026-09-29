import { adminUsersApi } from '@/api/admin/users.api';
import type { AdminUserDetail, AdminUserSummary } from '@/types/admin';

export const adminUserService = {
  async listUsers(filters?: { search?: string; role?: 'student' | 'admin'; page?: number; pageSize?: number }): Promise<AdminUserSummary[]> {
    // The endpoint is paginated (max 100 per page) — walk every page so the
    // admin sees all users, not just the first 20.
    const pageSize = 100;
    const first = await adminUsersApi.list({ ...filters, page: 1, pageSize });
    const items = [...(first?.items ?? [])];
    for (let page = 2; page <= (first?.totalPages ?? 1); page += 1) {
      const next = await adminUsersApi.list({ ...filters, page, pageSize });
      items.push(...(next?.items ?? []));
    }
    return items;
  },

  update(id: string, payload: { role?: 'student' | 'admin'; fullName?: string; school?: string; academicYear?: string }) {
    return adminUsersApi.update(id, payload);
  },

  sendPasswordReset(id: string) {
    return adminUsersApi.sendPasswordReset(id);
  },

  async resetAccount(id: string): Promise<void> {
    await adminUsersApi.resetAccount(id);
  },

  async getUserById(id: string): Promise<AdminUserDetail | undefined> {
    try {
      return await adminUsersApi.getById(id);
    } catch {
      return undefined;
    }
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    await adminUsersApi.setActive(id, isActive);
  },

  async remove(id: string): Promise<void> {
    await adminUsersApi.remove(id);
  },

  // getRecentTransactions is not a dedicated admin endpoint — kept as stub.
  async getRecentTransactions(_id: string, _limit = 5) {
    return [];
  },
};
