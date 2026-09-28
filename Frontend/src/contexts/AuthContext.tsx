import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, profileService, tokenService } from '@/services';
import type { LoginCredentials, RegisterPayload } from '@/types/auth';
import type { User } from '@/types/user';
import { ApiError } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenService.getAccessToken()) {
      setUser(null);
      return;
    }
    const isAuthRejection = (error: unknown) => {
      const status = error instanceof ApiError ? error.status : undefined;
      return status === 401 || status === 403;
    };
    try {
      let profile: User;
      try {
        profile = await profileService.getProfile();
      } catch (firstError) {
        // One retry for transient failures (serverless cold start, the API's
        // 503 while MongoDB connects, a dropped connection).
        if (isAuthRejection(firstError)) throw firstError;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        profile = await profileService.getProfile();
      }
      setUser(profile);
    } catch (error) {
      // Only drop the stored session when the server actually rejected it.
      // A timeout, network error or 5xx (API cold start, database briefly
      // unavailable) used to wipe valid tokens here and bounce the user to
      // the login page on an ordinary slow reload.
      if (isAuthRejection(error) || !tokenService.getRefreshToken()) {
        tokenService.clearTokens();
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  // httpClient dispatches this when a request's access token was expired AND
  // the refresh token could no longer renew it (expired/revoked) — the only
  // point that actually knows the session died, since it lives outside
  // React. ProtectedRoute redirects to /login as soon as user becomes null.
  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await authService.login(credentials);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await authService.register(payload);
    setUser(result.user);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await authService.loginWithGoogle(idToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, loginWithGoogle, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
