import { adminUsersApi } from '@/api/admin/users.api';
import type { AdminUserSummary } from '@/types/admin';

export const adminUserService = {
  async listUsers(filters?: { search?: string; role?: 'student' | 'admin'; page?: number; pageSize?: number }): Promise<AdminUserSummary[]> {
    const result = await adminUsersApi.list(filters ?? {});
    return result.items;
  },

  async getUserById(id: string): Promise<AdminUserSummary | undefined> {
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
