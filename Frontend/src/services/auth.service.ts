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

  // changePassword is not exposed by the backend yet — kept as a stub.
  async changePassword(_userId: string, _currentPassword: string, _newPassword: string): Promise<void> {
    throw new Error('Change password is not yet supported via the API.');
  },
};
