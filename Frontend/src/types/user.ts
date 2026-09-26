export type UserRole = 'student' | 'admin';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type IncomeFrequency = 'weekly' | 'monthly' | 'occasionally';

export interface OnboardingProfile {
  status: OnboardingStatus;
  currentStep: number;
  incomeSources: string[];
  incomeFrequency?: IncomeFrequency;
  spendingCategories: string[];
  goals: string[];
  completedAt?: string;
}

export interface OnboardingUpdate {
  status?: OnboardingStatus;
  currentStep?: number;
  incomeSources?: string[];
  incomeFrequency?: IncomeFrequency;
  spendingCategories?: string[];
  goals?: string[];
  monthlyAllowanceBaseline?: number;
  savingsGoalAmount?: number;
  // Not stored on the user document — the backend turns this into real
  // Budget records for the current month, split across the onboarding's
  // selected spending categories.
  monthlyBudget?: number;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  school?: string;
  academicYear?: string;
  monthlyAllowanceBaseline?: number;
  savingsGoalAmount?: number;
  avatarUrl?: string;
  onboarding?: OnboardingProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileUpdate {
  fullName?: string;
  school?: string;
  academicYear?: string;
  monthlyAllowanceBaseline?: number;
  savingsGoalAmount?: number;
  avatarUrl?: string;
}

export interface UserSettings {
  currency: string;
  monthlyIncomeGoal?: number;
  budgetAlertThreshold: number; // percentage, e.g. 80 = warn at 80% of budget
  emailNotifications: boolean;
  pushNotifications: boolean;
  aiCategorizationEnabled: boolean;
  aiInsightsEnabled: boolean;
}
