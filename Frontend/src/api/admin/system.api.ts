import { httpClient } from '../httpClient';
import type { ApiSuccess } from '@/types/api';

export interface EmailStatus {
  configured: boolean;
  providers: Array<'brevo' | 'resend' | 'smtp'>;
  from: string | null;
  lastErrors: Record<string, { message: string; at: string }>;
}

export interface BackupStats {
  totalBackups: number;
  totalBytes: number;
  usersWithBackup: number;
  usersBackedUpLast24h: number;
  activeUsers: number;
  lastBackupAt: string | null;
  cronConfigured: boolean;
}

export const adminSystemApi = {
  async emailStatus(): Promise<EmailStatus> {
    const { data } = await httpClient.get<ApiSuccess<EmailStatus>>('/admin/email/status');
    return data.data;
  },

  async sendTestEmail(to?: string): Promise<string> {
    const { data } = await httpClient.post<ApiSuccess<EmailStatus> & { message?: string }>('/admin/email/test', to ? { to } : {});
    return data.message ?? 'Test email sent.';
  },

  async backupStats(): Promise<BackupStats> {
    const { data } = await httpClient.get<ApiSuccess<BackupStats>>('/admin/backups');
    return data.data;
  },

  async runBackups(): Promise<string> {
    const { data } = await httpClient.post<ApiSuccess<unknown> & { message?: string }>('/admin/backups/run');
    return data.message ?? 'Backups finished.';
  },

  async backupUser(userId: string): Promise<void> {
    await httpClient.post(`/admin/users/${userId}/backup`);
  },
};
