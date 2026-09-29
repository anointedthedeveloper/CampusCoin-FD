import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';

export interface SupportMessagePayload {
  name: string;
  email: string;
  topic?: string;
  message: string;
}

export interface SupportMessage extends SupportMessagePayload {
  id: string;
  topic: string;
  status: 'open' | 'resolved';
  userId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const supportApi = {
  async send(payload: SupportMessagePayload): Promise<void> {
    await httpClient.post('/support/messages', payload);
  },

  // Admin
  async list(status?: 'open' | 'resolved'): Promise<{ items: SupportMessage[]; openCount: number }> {
    const { data } = await httpClient.get<ApiSuccess<SupportMessage[]> & { meta?: { openCount?: number } }>('/admin/support', {
      params: status ? { status } : undefined,
    });
    return { items: data.data ?? [], openCount: data.meta?.openCount ?? 0 };
  },

  async setStatus(id: string, status: 'open' | 'resolved'): Promise<void> {
    await httpClient.patch(`/admin/support/${id}`, { status });
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/admin/support/${id}`);
  },
};
