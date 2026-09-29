export const PUBLIC_ROUTES = {
  home: '/',
  about: '/about',
  features: '/features',
  faq: '/faq',
  login: '/login',
  adminLogin: '/adlg',
  register: '/register',
  forgotPassword: '/forgot-password',
  setPassword: '/set-password',
  help: '/help',
} as const;

export const STUDENT_ROUTES = {
  dashboard: '/dashboard',
  onboarding: '/onboarding',
  transactions: '/transactions',
  newTransaction: '/transactions/new',
  transactionDetail: '/transactions/:id',
  editTransaction: '/transactions/:id/edit',
  categories: '/categories',
  budgets: '/budgets',
  reports: '/reports',
  monthlyReport: '/reports/monthly',
  insights: '/insights',
  savingTips: '/saving-tips',
  savingsGoals: '/savings-goals',
  bookmarks: '/bookmarks',
  import: '/import',
  profile: '/profile',
  settings: '/settings',
  notifications: '/notifications',
  recurring: '/recurring',
  help: '/support',
} as const;

export const ADMIN_ROUTES = {
  dashboard: '/admin/dashboard',
  users: '/admin/users',
  userDetail: '/admin/users/:id',
  categories: '/admin/categories',
  announcements: '/admin/announcements',
  statistics: '/admin/statistics',
  profile: '/admin/profile',
  support: '/admin/support',
  system: '/admin/system',
} as const;

export function buildPath(pattern: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, value),
    pattern,
  );
}
