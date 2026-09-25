import { adminCategoriesApi } from '@/api/admin/categories.api';
import type { CategoryType } from '@/types/category';

export const FALLBACK_CATEGORY_NAMES = ['Others', 'Other Income'];

export interface DefaultCategoryTemplate {
  id: string;
  name: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export const adminCategoryService = {
  async list(type?: CategoryType): Promise<DefaultCategoryTemplate[]> {
    const all = await adminCategoriesApi.list();
    const filtered = type ? all.filter((c) => c.type === type) : all;
    return filtered.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      createdAt: c.createdAt as unknown as string,
      updatedAt: c.updatedAt as unknown as string,
    }));
  },

  async create(payload: { name: string; type: CategoryType }): Promise<DefaultCategoryTemplate> {
    const c = await adminCategoriesApi.create(payload);
    return { id: c.id, name: c.name, type: c.type, createdAt: c.createdAt as unknown as string, updatedAt: c.updatedAt as unknown as string };
  },

  async remove(id: string): Promise<void> {
    return adminCategoriesApi.remove(id);
  },
};
