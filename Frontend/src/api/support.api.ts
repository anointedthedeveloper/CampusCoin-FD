import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';

export interface SupportMessagePayload {
  name: string;
  email: string;
  topic?: string;
  message: string;
}

export interface SupportChatMessage {
  id: string;
  from: 'user' | 'admin';
  authorName: string;
  text: string;
  createdAt: string;
}

export interface SupportMessage extends SupportMessagePayload {
  id: string;
  topic: string;
  status: 'open' | 'resolved';
  userId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  lastActivityAt: string;
  unread: boolean;
  replyCount: number;
  messages: SupportChatMessage[];
}

export interface SupportListResult {
  items: SupportMessage[];
  openCount: number;
  unreadCount: number;
}

export const supportApi = {
  async send(payload: SupportMessagePayload): Promise<{ id: string; linked: boolean }> {
    const { data } = await httpClient.post<ApiSuccess<{ id: string; linked: boolean }>>('/support/messages', payload);
    return data.data;
  },

  // Signed-in student
  async myThreads(): Promise<{ items: SupportMessage[]; unreadCount: number }> {
    const { data } = await httpClient.get<ApiSuccess<SupportMessage[]> & { meta?: { unreadCount?: number } }>('/support/threads');
    return { items: data.data ?? [], unreadCount: data.meta?.unreadCount ?? 0 };
  },

  async myThread(id: string): Promise<SupportMessage> {
    const { data } = await httpClient.get<ApiSuccess<SupportMessage>>(`/support/threads/${id}`);
    return data.data;
  },

  async replyAsUser(id: string, text: string): Promise<SupportMessage> {
    const { data } = await httpClient.post<ApiSuccess<SupportMessage>>(`/support/threads/${id}/replies`, { text });
    return data.data;
  },

  // Admin
  async list(status?: 'open' | 'resolved'): Promise<SupportListResult> {
    const { data } = await httpClient.get<ApiSuccess<SupportMessage[]> & { meta?: { openCount?: number; unreadCount?: number } }>('/admin/support', {
      params: status ? { status } : undefined,
    });
    return { items: data.data ?? [], openCount: data.meta?.openCount ?? 0, unreadCount: data.meta?.unreadCount ?? 0 };
  },

  async get(id: string): Promise<SupportMessage> {
    const { data } = await httpClient.get<ApiSuccess<SupportMessage>>(`/admin/support/${id}`);
    return data.data;
  },

  async reply(id: string, text: string, resolve = false): Promise<{ thread: SupportMessage; emailed: boolean; inApp: boolean }> {
    const { data } = await httpClient.post<ApiSuccess<SupportMessage> & { meta?: { emailed?: boolean; inApp?: boolean } }>(
      `/admin/support/${id}/replies`,
      { text, resolve },
    );
    return { thread: data.data, emailed: Boolean(data.meta?.emailed), inApp: Boolean(data.meta?.inApp) };
  },

  async setStatus(id: string, status: 'open' | 'resolved'): Promise<void> {
    await httpClient.patch(`/admin/support/${id}`, { status });
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/admin/support/${id}`);
  },
};
