import {
  Activity,
  Briefcase,
  Bus,
  Film,
  Gift,
  GraduationCap,
  Heart,
  Home,
  PieChart,
  PiggyBank,
  Rocket,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  User,
  Utensils,
  Wallet,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

export interface OnboardingOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const INCOME_SOURCE_OPTIONS: OnboardingOption[] = [
  { value: 'allowance', label: 'Allowance', icon: Wallet },
  { value: 'salary', label: 'Salary / Part-time work', icon: Briefcase },
  { value: 'scholarship', label: 'Scholarship', icon: GraduationCap },
  { value: 'family-support', label: 'Family support', icon: Gift },
  { value: 'business', label: 'Business / Side hustle', icon: Rocket },
  { value: 'other', label: 'Other', icon: User },
];

export const SPENDING_CATEGORY_OPTIONS: OnboardingOption[] = [
  { value: 'food', label: 'Food', icon: Utensils },
  { value: 'transportation', label: 'Transportation', icon: Bus },
  { value: 'academics', label: 'School / Academics', icon: GraduationCap },
  { value: 'data-internet', label: 'Data & Internet', icon: Wifi },
  { value: 'entertainment', label: 'Entertainment', icon: Film },
  { value: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { value: 'accommodation', label: 'Accommodation', icon: Home },
  { value: 'health', label: 'Health', icon: Heart },
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'other', label: 'Other', icon: PieChart },
];

export const FINANCIAL_GOAL_OPTIONS: OnboardingOption[] = [
  { value: 'track-spending', label: 'Track my spending', icon: Activity },
  { value: 'control-spending', label: 'Control unnecessary spending', icon: TrendingDown },
  { value: 'create-budget', label: 'Create a budget', icon: Wallet },
  { value: 'save-money', label: 'Save money', icon: PiggyBank },
  { value: 'understand-money', label: 'Understand where my money goes', icon: PieChart },
  { value: 'better-habits', label: 'Build better financial habits', icon: Sparkles },
];

export const INCOME_FREQUENCY_OPTIONS: { value: 'weekly' | 'monthly' | 'occasionally'; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'occasionally', label: 'Occasionally' },
];

export const TOTAL_ONBOARDING_STEPS = 4;
