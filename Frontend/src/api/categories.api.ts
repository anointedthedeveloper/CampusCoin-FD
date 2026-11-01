// The student's own income/expense category endpoints.

import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';
import type { Category, CategoryPayload } from '@/types/category';

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data } = await httpClient.get<ApiSuccess<Category[]>>('/categories');
    return data.data ?? [];
  },

  async create(payload: CategoryPayload): Promise<Category> {
    const { data } = await httpClient.post<ApiSuccess<Category>>('/categories', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<CategoryPayload>): Promise<Category> {
    const { data } = await httpClient.patch<ApiSuccess<Category>>(`/categories/${id}`, payload);
    return data.data;
  },

  /** Deletes a category; anything using it moves to the fallback category, and the count is returned. */
  async remove(id: string): Promise<{ reassignedCount: number }> {
    const { data } = await httpClient.delete<{ data?: { reassignedCount?: number } }>(`/categories/${id}`);
    return { reassignedCount: data?.data?.reassignedCount ?? 0 };
  },
};
