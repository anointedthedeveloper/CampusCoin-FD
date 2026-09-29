import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';

export interface BackupSummary {
  id: string;
  kind: 'daily' | 'manual' | 'pre-restore';
  sizeBytes: number;
  counts: Partial<Record<'transactions' | 'categories' | 'budgets' | 'recurring' | 'savingsGoals' | 'bookmarks' | 'tipStates', number>>;
  createdAt: string;
}

export type RestoreCounts = Record<string, number>;

export const backupsApi = {
  async list(): Promise<BackupSummary[]> {
    const { data } = await httpClient.get<ApiSuccess<BackupSummary[]>>('/backups');
    return data.data ?? [];
  },

  async create(): Promise<BackupSummary> {
    const { data } = await httpClient.post<ApiSuccess<BackupSummary>>('/backups');
    return data.data;
  },

  async download(id: string): Promise<Blob> {
    const { data } = await httpClient.get<Blob>(`/backups/${id}/download`, { responseType: 'blob' });
    return data;
  },

  async restore(id: string): Promise<RestoreCounts> {
    const { data } = await httpClient.post<ApiSuccess<RestoreCounts>>(`/backups/${id}/restore`);
    return data.data;
  },

  async restoreFile(snapshot: unknown): Promise<RestoreCounts> {
    const { data } = await httpClient.post<ApiSuccess<RestoreCounts>>('/backups/restore-file', snapshot);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/backups/${id}`);
  },
};
