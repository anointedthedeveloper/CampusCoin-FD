import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Receipt,
  Settings,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { STUDENT_ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Logo } from '@/components/common';
import { cn } from '@/utils/cn';

const navItems = [
  { to: STUDENT_ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: `${STUDENT_ROUTES.newTransaction}?type=income`, label: 'Income', icon: TrendingUp, txnType: 'income' },
  { to: `${STUDENT_ROUTES.newTransaction}?type=expense`, label: 'Expenses', icon: TrendingDown, txnType: 'expense' },
  { to: STUDENT_ROUTES.budgets, label: 'Budgets', icon: Wallet },
  { to: STUDENT_ROUTES.reports, label: 'Reports', icon: Receipt },
  { to: STUDENT_ROUTES.savingTips, label: 'Saving Tips', icon: PiggyBank },
  { to: STUDENT_ROUTES.insights, label: 'AI Assistant', icon: Bot },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const activeTxnType = location.pathname === STUDENT_ROUTES.newTransaction
    ? new URLSearchParams(location.search).get('type')
    : null;

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col bg-brand-950 text-brand-100 transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          isSidebarOpen && 'translate-x-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <Link to={STUDENT_ROUTES.dashboard}>
            <Logo iconClassName="h-9 w-9" wordmarkClassName="text-white" />
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-brand-100/70 transition-colors duration-200 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map(({ to, label, icon: Icon, end, txnType }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100/80 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white',
                  (txnType ? activeTxnType === txnType : isActive) && 'bg-brand-600 text-white shadow-sm',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-4">
          <NavLink
            to={STUDENT_ROUTES.settings}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100/80 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white',
                isActive && 'bg-brand-600 text-white shadow-sm',
              )
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-100/80 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo showWordmark={false} iconClassName="h-8 w-8" />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <NavLink
              to={STUDENT_ROUTES.notifications}
              className="text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:text-brand-600"
            >
              <Bell className="h-5 w-5" />
            </NavLink>
            <NavLink to={STUDENT_ROUTES.profile} className="flex items-center gap-2">
              <Avatar name={user?.fullName ?? 'Student'} size="sm" />
              <span className="hidden text-sm font-medium text-gray-700 sm:inline">
                {user?.fullName ?? 'Student'}
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
