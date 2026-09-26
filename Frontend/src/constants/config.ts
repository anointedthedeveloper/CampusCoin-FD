export const APP_NAME = 'Campus Coin';
export const APP_TAGLINE = 'NextGen BudgetBee';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://campuscoin-backend.vercel.app/api/v1';

export const FEATURE_FLAGS = {
  aiCategorization: import.meta.env.VITE_FEATURE_AI_CATEGORIZATION === 'true',
  aiInsights: import.meta.env.VITE_FEATURE_AI_INSIGHTS === 'true',
} as const;

export const DEFAULT_CURRENCY = 'NGN';
export const DEFAULT_BUDGET_ALERT_THRESHOLD = 80;

export const AUTH_TOKEN_STORAGE_KEY = 'campus-coin.accessToken';
export const REFRESH_TOKEN_STORAGE_KEY = 'campus-coin.refreshToken';
