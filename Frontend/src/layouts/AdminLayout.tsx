import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  ListTree,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { ADMIN_ROUTES, PUBLIC_ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Logo, ThemeToggle } from '@/components/common';
import { cn } from '@/utils/cn';

const navItems = [
  { to: ADMIN_ROUTES.dashboard,     label: 'Overview',             icon: LayoutDashboard, description: 'Platform overview and quick actions' },
  { to: ADMIN_ROUTES.users,         label: 'Users',                icon: Users,           description: 'View, suspend, reset or delete accounts' },
  { to: ADMIN_ROUTES.categories,    label: 'Categories',           icon: ListTree,        description: 'Default income and expense categories' },
  { to: ADMIN_ROUTES.announcements, label: 'Announcements & Tips', icon: Megaphone,       description: 'Announcements and saving-tip templates' },
  { to: ADMIN_ROUTES.statistics,    label: 'Statistics',           icon: BarChart3,       description: 'Usage analytics' },
];

function currentSection(pathname: string) {
  return navItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ?? navItems[0];
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const section = currentSection(location.pathname);
  const isDetail = location.pathname !== section.to;

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[#f4f7f5] dark:bg-background">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[16rem] shrink-0 -translate-x-full flex-col',
          'bg-gradient-to-b from-brand-950 via-[#0b2a19] to-[#07170e] text-gray-100',
          'transition-transform duration-300 ease-spring',
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          isSidebarOpen && 'translate-x-0',
        )}
      >
        <div className="flex items-start justify-between px-5 pb-4 pt-5">
          <div>
            <Link to={ADMIN_ROUTES.dashboard} className="flex items-center gap-2.5">
              <Logo iconClassName="h-8 w-8" wordmarkClassName="text-white text-sm font-bold tracking-tight" />
            </Link>
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              Admin Console
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Admin">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/40">Manage</p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive || location.pathname.startsWith(`${to}/`)
                    ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'text-emerald-50/60 hover:bg-white/[0.06] hover:text-white',
                )
              }
            >
              {({ isActive }) => {
                const active = isActive || location.pathname.startsWith(`${to}/`);
                return (
                  <>
                    {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400" aria-hidden="true" />}
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        active ? 'bg-emerald-400/20 text-emerald-300' : 'text-emerald-100/50 group-hover:text-emerald-200',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{label}</span>
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <Link
            to={PUBLIC_ROUTES.home}
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-emerald-50/60 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View public site
          </Link>
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <Avatar name={user?.fullName ?? 'Admin'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.fullName ?? 'Administrator'}</p>
              <p className="truncate text-[11px] text-emerald-50/50">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="shrink-0 rounded-lg p-1.5 text-emerald-50/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-gray-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-surface/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/[0.08] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-text-muted">
                <li>Admin</li>
                <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
                <li className={cn(!isDetail && 'font-semibold text-gray-900 dark:text-text-primary')}>
                  {isDetail ? <Link to={section.to} className="hover:text-brand-700 dark:hover:text-primary-accent">{section.label}</Link> : section.label}
                </li>
                {isDetail && (
                  <>
                    <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
                    <li className="font-semibold text-gray-900 dark:text-text-primary">Details</li>
                  </>
                )}
              </ol>
              <p className="hidden truncate text-[11px] text-gray-400 dark:text-text-muted sm:block">{section.description}</p>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 dark:border-white/10 dark:bg-surface-elevated sm:flex">
              <Avatar name={user?.fullName ?? 'Admin'} size="sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">{user?.fullName ?? 'Administrator'}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
