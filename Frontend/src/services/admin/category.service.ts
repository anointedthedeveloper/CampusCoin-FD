import { adminCategoriesApi, type AdminCategoryTemplate, type AdminCategoryUpdate } from '@/api/admin/categories.api';
import type { CategoryType } from '@/types/category';

export const FALLBACK_CATEGORY_NAMES = ['Other', 'Miscellaneous', 'Other Income'];

export type DefaultCategoryTemplate = AdminCategoryTemplate;

export const adminCategoryService = {
  async list(type?: CategoryType): Promise<DefaultCategoryTemplate[]> {
    const all = await adminCategoriesApi.list();
    return type ? all.filter((c) => c.type === type) : all;
  },

  create(payload: { name: string; type: CategoryType; color?: string }) {
    return adminCategoriesApi.create(payload);
  },

  update(id: string, payload: AdminCategoryUpdate) {
    return adminCategoriesApi.update(id, payload);
  },

  remove(id: string, removeFromStudents = false) {
    return adminCategoriesApi.remove(id, removeFromStudents);
  },
};
