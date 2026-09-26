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

// No backend exists yet — this key persists the mock signed-in user (see
// src/services/auth.service.ts and src/services/profile.service.ts) so a
// session survives a reload without a real API.
export const MOCK_USER_STORAGE_KEY = 'campus-coin.mockUser';

// Local "database" of accounts created via the mock register()/Google
// sign-in flow, keyed by lowercased email, so logging back in returns the
// same identity instead of a fresh generic one. See auth.service.ts.
export const MOCK_USERS_DIRECTORY_KEY = 'campus-coin.mockUsersDirectory';

// Per-user collections. Every record in these stores a `userId` so one
// browser can hold several accounts' data side by side without it mixing
// (see src/lib/localCollection.ts and the services that use these keys).
export const CATEGORIES_STORAGE_KEY = 'campus-coin.categories';
export const TRANSACTIONS_STORAGE_KEY = 'campus-coin.transactions';
export const BUDGETS_STORAGE_KEY = 'campus-coin.budgets';
export const NOTIFICATIONS_STORAGE_KEY = 'campus-coin.notifications';
export const SETTINGS_STORAGE_KEY = 'campus-coin.settings';
export const DISMISSED_TIPS_STORAGE_KEY = 'campus-coin.dismissedTips';
export const TIP_BOOKMARKS_STORAGE_KEY = 'campus-coin.tipBookmarks';

// Admin-console-only stores. These are global (not per-user) — see
// src/services/admin/*.service.ts.
export const DEFAULT_CATEGORY_TEMPLATES_KEY = 'campus-coin.defaultCategoryTemplates';
export const ADMIN_SUSPENDED_USERS_KEY = 'campus-coin.suspendedUserIds';
export const ANNOUNCEMENTS_STORAGE_KEY = 'campus-coin.announcements';
