import { httpClient } from './httpClient';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginCredentials,
  RegisterPayload,
  ResetPasswordPayload,
} from '@/types/auth';
import type { ApiSuccess } from '@/types/api';

export interface AuthSession {
  id: string;
  method: 'password' | 'google' | 'register' | 'refresh';
  userAgent: string;
  ip: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export const authApi = {
  async sessions(): Promise<AuthSession[]> {
    const { data } = await httpClient.get<ApiSuccess<AuthSession[]>>('/auth/sessions');
    return data.data ?? [];
  },

  async revokeSession(id: string): Promise<void> {
    await httpClient.delete(`/auth/sessions/${id}`);
  },

  async revokeOtherSessions(): Promise<number> {
    const { data } = await httpClient.delete<ApiSuccess<{ count: number }>>('/auth/sessions');
    return data.data?.count ?? 0;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await httpClient.post<ApiSuccess<AuthResponse>>('/auth/login', credentials);
    return data.data;
  },

  async loginWithGoogle(idToken: string, linkAccount = false): Promise<AuthResponse> {
    const { data } = await httpClient.post<ApiSuccess<AuthResponse>>('/auth/google', { idToken, linkAccount });
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await httpClient.post<ApiSuccess<AuthResponse>>('/auth/register', payload);
    return data.data;
  },

  async logout(): Promise<void> {
    await httpClient.post('/auth/logout');
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await httpClient.post('/auth/forgot-password', payload);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await httpClient.post('/auth/reset-password', payload);
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    await httpClient.patch('/auth/change-password', payload);
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const { data } = await httpClient.post<ApiSuccess<AuthResponse>>('/auth/refresh', {
      refreshToken,
    });
    return data.data;
  },
};
