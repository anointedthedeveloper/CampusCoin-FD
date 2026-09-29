import { httpClient } from '../httpClient';
import type { ApiSuccess } from '@/types/api';
import type { CategoryType } from '@/types/category';

export interface AdminCategoryTemplate {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  isDefault: boolean;
  studentCount?: number;
  transactionCount?: number;
  isProtected?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategoryUpdate {
  name?: string;
  color?: string;
  icon?: string;
  /** Also rename/recolour every student's copy. */
  applyToStudents?: boolean;
}

export const adminCategoriesApi = {
  async list(): Promise<AdminCategoryTemplate[]> {
    const { data } = await httpClient.get<ApiSuccess<AdminCategoryTemplate[]>>('/admin/categories');
    return data.data ?? [];
  },

  async create(payload: { name: string; type: CategoryType; color?: string; icon?: string }): Promise<AdminCategoryTemplate> {
    const { data } = await httpClient.post<ApiSuccess<AdminCategoryTemplate>>('/admin/categories', payload);
    return data.data;
  },

  async update(id: string, payload: AdminCategoryUpdate): Promise<AdminCategoryTemplate & { studentsUpdated?: number }> {
    const { data } = await httpClient.patch<ApiSuccess<AdminCategoryTemplate & { studentsUpdated?: number }>>(`/admin/categories/${id}`, payload);
    return data.data;
  },

  async remove(id: string, removeFromStudents = false): Promise<{ studentsRemoved: number }> {
    const { data } = await httpClient.delete<ApiSuccess<{ studentsRemoved: number }>>(`/admin/categories/${id}`, {
      params: removeFromStudents ? { removeFromStudents: 'true' } : undefined,
    });
    return data.data ?? { studentsRemoved: 0 };
  },
};
