import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, LayoutDashboard, ListTree, LogOut, Megaphone, Menu, Shield, Users, X } from 'lucide-react';
import { ADMIN_ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Logo, ThemeToggle } from '@/components/common';
import { cn } from '@/utils/cn';

const navItems = [
  { to: ADMIN_ROUTES.dashboard,     label: 'Overview',             icon: LayoutDashboard },
  { to: ADMIN_ROUTES.users,         label: 'Users',                icon: Users },
  { to: ADMIN_ROUTES.categories,    label: 'Categories',           icon: ListTree },
  { to: ADMIN_ROUTES.announcements, label: 'Announcements & Tips', icon: Megaphone },
  { to: ADMIN_ROUTES.statistics,    label: 'Statistics',           icon: BarChart3 },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50/80 dark:bg-background">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[15rem] shrink-0 -translate-x-full flex-col',
          'bg-gray-950 text-gray-100',
          'transition-transform duration-300 ease-spring',
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          isSidebarOpen && 'translate-x-0',
        )}
      >
        {/* Logo + badge */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
          <div>
            <Link to={ADMIN_ROUTES.dashboard} className="flex items-center gap-2.5">
              <Logo iconClassName="h-7 w-7" wordmarkClassName="text-white text-sm font-bold tracking-tight" />
            </Link>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-amber-400" />
              <span className="text-2xs font-semibold uppercase tracking-widest text-amber-400">
                Admin Console
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/8 hover:text-white transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p className="px-3 pb-2 pt-1 text-2xs font-semibold uppercase tracking-widest text-gray-500">
            Navigation
          </p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  'text-gray-400 transition-all duration-150',
                  'hover:bg-white/6 hover:text-gray-100',
                  isActive && 'bg-amber-500/15 text-amber-300 font-semibold',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-gray-500 group-hover:text-gray-300',
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar name={user?.fullName ?? 'Admin'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-200">{user?.fullName ?? 'Administrator'}</p>
              <p className="truncate text-2xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={() => void logout()}
              className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-white/8 hover:text-gray-200 transition-colors"
              aria-label="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className={cn(
          'sticky top-0 z-30',
          'flex items-center justify-between gap-4',
          'border-b border-gray-100 bg-white/90 backdrop-blur-md px-4 py-2.5',
          'dark:border-white/5 dark:bg-surface/90',
        )}>
          {/* Mobile */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:hover:bg-white/8 dark:text-text-secondary"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo showWordmark={false} iconClassName="h-7 w-7" />
          </div>

          <div className="hidden lg:block" />

          {/* Right */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <Avatar name={user?.fullName ?? 'Admin'} size="sm" />
              <span className="hidden text-sm font-medium text-gray-700 dark:text-text-secondary sm:block">
                {user?.fullName ?? 'Administrator'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
