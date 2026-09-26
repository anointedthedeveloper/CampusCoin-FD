import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, LayoutDashboard, ListTree, LogOut, Megaphone, Menu, Users, X } from 'lucide-react';
import { ADMIN_ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Logo, ThemeToggle } from '@/components/common';
import { cn } from '@/utils/cn';

const navItems = [
  { to: ADMIN_ROUTES.dashboard, label: 'Overview', icon: LayoutDashboard },
  { to: ADMIN_ROUTES.users, label: 'Users', icon: Users },
  { to: ADMIN_ROUTES.categories, label: 'Categories', icon: ListTree },
  { to: ADMIN_ROUTES.announcements, label: 'Announcements & Tips', icon: Megaphone },
  { to: ADMIN_ROUTES.statistics, label: 'Statistics', icon: BarChart3 },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

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
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col bg-brand-950 text-brand-100 transition-transform duration-300 ease-out dark:bg-surface lg:static lg:translate-x-0',
          isSidebarOpen && 'translate-x-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <Link to={ADMIN_ROUTES.dashboard}>
              <Logo iconClassName="h-9 w-9" wordmarkClassName="text-white" />
            </Link>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-300">Admin Console</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-100/70 transition-colors duration-200 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100/80 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white',
                  isActive && 'bg-brand-600 text-white shadow-sm',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
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
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-surface-elevated sm:px-6">
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
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Avatar name={user?.fullName ?? 'Admin'} size="sm" />
            <span className="hidden text-sm font-medium text-gray-700 dark:text-text-secondary sm:inline">
              {user?.fullName ?? 'Administrator'}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
