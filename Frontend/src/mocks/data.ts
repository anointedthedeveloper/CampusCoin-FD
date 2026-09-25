/**
 * The default settings a brand-new account starts with (see
 * profileService.getSettings in src/services/profile.service.ts) — not
 * mock content shown anywhere, just the initial value before a student
 * customizes their own settings.
 */
import type { UserSettings } from '@/types';

export const MOCK_SETTINGS: UserSettings = {
  currency: 'NGN',
  monthlyIncomeGoal: 150000,
  budgetAlertThreshold: 80,
  emailNotifications: true,
  pushNotifications: true,
  aiCategorizationEnabled: true,
  aiInsightsEnabled: true,
};
