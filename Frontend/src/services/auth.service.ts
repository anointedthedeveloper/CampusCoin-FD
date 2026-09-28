import { authApi } from '@/api/auth.api';
import { requestGoogleIdToken } from '@/lib/googleIdentity';
import { tokenService } from './token.service';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginCredentials,
  RegisterPayload,
  ResetPasswordPayload,
} from '@/types/auth';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const result = await authApi.login(credentials);
    tokenService.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const result = await authApi.register(payload);
    tokenService.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  async loginWithGoogle(): Promise<AuthResponse> {
    const idToken = await requestGoogleIdToken();
    const result = await authApi.loginWithGoogle(idToken);
    tokenService.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Even if the server call fails, clear local tokens
    } finally {
      tokenService.clearTokens();
    }
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await authApi.forgotPassword(payload);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await authApi.resetPassword(payload);
  },

  isAuthenticated(): boolean {
    return Boolean(tokenService.getAccessToken());
  },

  // changePassword requires the current password for verification.
  // Google-only accounts (no passwordHash) may omit currentPassword.
  async changePassword(_userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await authApi.changePassword({ currentPassword, newPassword });
  },
};
