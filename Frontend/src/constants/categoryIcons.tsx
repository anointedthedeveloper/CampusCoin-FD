import {
  BookOpen,
  Bus,
  Film,
  Gift,
  GraduationCap,
  Home,
  MoreHorizontal,
  Plus,
  Repeat,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryIcon {
  icon: LucideIcon;
  badgeClassName: string;
}

export const INCOME_CATEGORY_ICONS: Record<string, CategoryIcon> = {
  Allowance: { icon: Wallet, badgeClassName: 'bg-purple-100 text-purple-600' },
  'Part-time Job': { icon: Bus, badgeClassName: 'bg-blue-100 text-blue-600' },
  Scholarship: { icon: GraduationCap, badgeClassName: 'bg-brand-100 text-brand-700' },
  Gift: { icon: Gift, badgeClassName: 'bg-pink-100 text-pink-600' },
  'Other Income': { icon: Plus, badgeClassName: 'bg-gray-100 text-gray-600' },
};

export const EXPENSE_CATEGORY_ICONS: Record<string, CategoryIcon> = {
  Food: { icon: Utensils, badgeClassName: 'bg-red-100 text-red-600' },
  Transport: { icon: Bus, badgeClassName: 'bg-blue-100 text-blue-600' },
  'Hostel/Rent': { icon: Home, badgeClassName: 'bg-purple-100 text-purple-600' },
  Academics: { icon: BookOpen, badgeClassName: 'bg-indigo-100 text-indigo-600' },
  Entertainment: { icon: Film, badgeClassName: 'bg-pink-100 text-pink-600' },
  Subscriptions: { icon: Repeat, badgeClassName: 'bg-teal-100 text-teal-600' },
  Others: { icon: MoreHorizontal, badgeClassName: 'bg-gray-100 text-gray-600' },
};

export const DEFAULT_CATEGORY_ICON: CategoryIcon = {
  icon: MoreHorizontal,
  badgeClassName: 'bg-gray-100 text-gray-600',
};
