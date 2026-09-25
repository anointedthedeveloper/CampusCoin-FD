import { categoriesApi } from '@/api/categories.api';
import type { Category, CategoryPayload, CategoryType } from '@/types/category';

export const categoryService = {
  async list(_userId?: string, type?: CategoryType): Promise<Category[]> {
    const all = await categoriesApi.list();
    return type ? all.filter((c) => c.type === type) : all;
  },

  async getById(_userId: string, id: string): Promise<Category | undefined> {
    const all = await categoriesApi.list();
    return all.find((c) => c.id === id);
  },

  async create(_userId: string, payload: CategoryPayload): Promise<Category> {
    return categoriesApi.create(payload);
  },

  async update(_userId: string, id: string, payload: Partial<CategoryPayload>): Promise<Category> {
    return categoriesApi.update(id, payload);
  },

  async remove(_userId: string, id: string): Promise<{ reassignedCount: number }> {
    await categoriesApi.remove(id);
    return { reassignedCount: 0 };
  },

  // Seeding is handled server-side at registration — no-op on the client.
  seedDefaultsForUser(_userId: string): void {
    return;
  },

  // No-op — deletion is handled server-side.
  deleteAllForUser(_userId: string): void {
    return;
  },
};
