import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from '@/constants/config';
import { ApiError, type ApiErrorBody } from '@/types/api';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  // Fail fast instead of hanging indefinitely — without this, a slow or
  // unreachable backend keeps isLoading=true in AuthContext forever, which
  // holds every ProtectedRoute in a permanent loader state.
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Access tokens are short-lived (15 min) so a session that's merely sitting
// on a page, or a plain page reload after that window, would otherwise look
// exactly like being logged out. This silently exchanges the refresh token
// for a new pair on the first 401 and retries the original request, so
// "auto login" actually survives token expiry rather than just a page load.
const REFRESH_URL = '/auth/refresh';
const NO_REFRESH_PATHS = [REFRESH_URL, '/auth/login', '/auth/register', '/auth/google'];

let refreshPromise: Promise<string> | null = null;

function clearSessionAndNotify(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  // AuthContext listens for this to clear its in-memory user — httpClient
  // has no React context of its own to update directly.
  window.dispatchEvent(new Event('auth:session-expired'));
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) throw new Error('No refresh token available');

  // A plain axios call, not httpClient — going through httpClient here would
  // re-enter this same response interceptor on failure.
  const { data } = await axios.post(`${API_BASE_URL}${REFRESH_URL}`, { refreshToken }, { timeout: 10000 });
  const accessToken = data?.data?.accessToken;
  const nextRefreshToken = data?.data?.refreshToken;
  if (!accessToken || !nextRefreshToken) throw new Error('Malformed refresh response');
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken);
  return accessToken;
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isRefreshable =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !NO_REFRESH_PATHS.some((path) => originalRequest.url?.includes(path));

    if (isRefreshable && originalRequest) {
      originalRequest._retry = true;
      try {
        // Multiple requests can 401 at once (e.g. a page firing several
        // calls in parallel) — share one in-flight refresh instead of
        // racing several refresh calls against the same refresh token.
        refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
        const newAccessToken = await refreshPromise;
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        return httpClient(originalRequest);
      } catch (refreshError) {
        // Only a definitive rejection of the refresh token (401/403/400, or a
        // missing token) ends the session. A network error, timeout or 5xx
        // (e.g. the API cold-starting or the database briefly unavailable)
        // must not log the user out — the next request can try again.
        const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        const isDefinitive =
          !axios.isAxiosError(refreshError) || (refreshStatus !== undefined && refreshStatus >= 400 && refreshStatus < 500);
        if (isDefinitive) clearSessionAndNotify();
        // Fall through to the normal error below, using the ORIGINAL 401.
      }
    }

    const body = error.response?.data;
    throw new ApiError(body?.message ?? error.message ?? 'Unexpected network error', {
      code: body?.code,
      status: error.response?.status,
      fieldErrors: body?.fieldErrors,
    });
  },
);
