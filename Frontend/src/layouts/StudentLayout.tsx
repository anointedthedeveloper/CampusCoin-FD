import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Receipt,
  Tags,
  User,
  Wallet,
  X,
  BarChart3,
} from 'lucide-react';
import { STUDENT_ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Logo, ThemeToggle } from '@/components/common';
import { cn } from '@/utils/cn';

const navItems = [
  { to: STUDENT_ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: STUDENT_ROUTES.newTransaction, label: 'Add Transaction', icon: Plus },
  { to: STUDENT_ROUTES.transactions, label: 'Transactions', icon: Receipt },
  { to: STUDENT_ROUTES.budgets, label: 'Budgets', icon: Wallet },
  { to: STUDENT_ROUTES.reports, label: 'Reports', icon: BarChart3 },
  { to: STUDENT_ROUTES.savingTips, label: 'Saving Tips', icon: PiggyBank },
  { to: STUDENT_ROUTES.insights, label: 'AI Assistant', icon: Bot },
  { to: STUDENT_ROUTES.categories, label: 'Categories', icon: Tags },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-background">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 -translate-x-full flex-col bg-brand-950 text-brand-100 transition-transform duration-300 ease-out dark:bg-surface lg:static lg:translate-x-0',
          isSidebarOpen && 'translate-x-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <Link to={STUDENT_ROUTES.dashboard}>
            <Logo iconClassName="h-8 w-8" wordmarkClassName="text-white" />
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-brand-100/70 transition-colors duration-200 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100/75 transition-all duration-200 hover:bg-white/10 hover:text-white',
                  isActive && 'bg-brand-600 text-white shadow-sm',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-white/10 p-3">
          <NavLink
            to={STUDENT_ROUTES.profile}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100/75 transition-all duration-200 hover:bg-white/10 hover:text-white',
                isActive && 'bg-brand-600 text-white shadow-sm',
              )
            }
          >
            <User className="h-4 w-4 shrink-0" />
            Profile
          </NavLink>
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-100/75 transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-surface-elevated sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-text-primary"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo showWordmark={false} iconClassName="h-8 w-8" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {/* Notifications with tooltip */}
            <NavLink
              to={STUDENT_ROUTES.notifications}
              className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-brand-600 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-primary-accent"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Notifications
              </span>
            </NavLink>

            {/* AI Assistant with tooltip */}
            <NavLink
              to={STUDENT_ROUTES.insights}
              className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-brand-600 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-primary-accent"
              aria-label="AI Assistant"
            >
              <Bot className="h-5 w-5" />
              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Any questions?
              </span>
            </NavLink>

            <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-white/10" />

            {/* Profile */}
            <NavLink to={STUDENT_ROUTES.profile} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/10">
              <Avatar name={user?.fullName ?? 'Student'} size="sm" />
              <span className="hidden text-sm font-medium text-gray-700 dark:text-text-secondary sm:inline">
                {user?.fullName?.split(' ')[0] ?? 'Student'}
              </span>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
