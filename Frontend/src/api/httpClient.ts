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


// Access tokens are short-lived (15 min) so a session that's merely sitting
// on a page, or a plain page reload after that window, would otherwise look
// exactly like being logged out. This silently exchanges the refresh token
// for a new pair on the first 401 and retries the original request, so
// "auto login" actually survives token expiry rather than just a page load.
const REFRESH_URL = '/auth/refresh';
const NO_REFRESH_PATHS = [REFRESH_URL, '/auth/login', '/auth/register', '/auth/google'];

let refreshPromise: Promise<string> | null = null;

export const LOGOUT_REASON_STORAGE_KEY = 'campus-coin.logoutReason';

function clearSessionAndNotify(reason?: string): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  if (reason) {
    try {
      sessionStorage.setItem(LOGOUT_REASON_STORAGE_KEY, reason);
    } catch {
      // ignore
    }
  }
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

/** Seconds-since-epoch expiry of a JWT, or null if it can't be read. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

// Refresh BEFORE sending when the access token has (nearly) expired. Without
// this, every visit after 15 minutes started with a red "401 Unauthorized"
// in the console (the request was rejected, then retried after refreshing).
httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const isAuthCall = NO_REFRESH_PATHS.some((path) => config.url?.includes(path));
  if (token && !isAuthCall && localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
    const exp = tokenExpiry(token);
    if (exp !== null && exp * 1000 < Date.now() + 30_000) {
      try {
        refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
        token = await refreshPromise;
      } catch (refreshError) {
        const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        if (!axios.isAxiosError(refreshError) || (status !== undefined && status >= 400 && status < 500)) {
          clearSessionAndNotify();
          token = null;
        }
        // Otherwise (offline, 5xx) send with the old token; the response
        // interceptor below handles the outcome.
      }
    }
  }
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

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
    // An admin suspended this account while it was signed in: end the
    // session now instead of letting every page fail with 403s.
    if (error.response?.status === 403 && body?.code === 'ACCOUNT_SUSPENDED' && localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
      clearSessionAndNotify(body.message);
    }
    throw new ApiError(body?.message ?? error.message ?? 'Unexpected network error', {
      code: body?.code,
      status: error.response?.status,
      fieldErrors: body?.fieldErrors,
    });
  },
);
