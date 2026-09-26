import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Receipt,
  Settings,
  Sparkles,
  Tags,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { STUDENT_ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Logo, ThemeToggle } from '@/components/common';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/utils/cn';

const navItems = [
  { to: STUDENT_ROUTES.dashboard,      label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: STUDENT_ROUTES.newTransaction, label: 'Add Transaction', icon: Plus,            end: true },
  { to: STUDENT_ROUTES.transactions,   label: 'Transactions',  icon: Receipt },
  { to: STUDENT_ROUTES.budgets,        label: 'Budgets',       icon: Wallet },
  { to: STUDENT_ROUTES.reports,        label: 'Reports',       icon: BarChart3 },
  { to: STUDENT_ROUTES.savingTips,     label: 'Saving Tips',   icon: PiggyBank },
  { to: STUDENT_ROUTES.insights,       label: 'AI Assistant',  icon: Bot },
  { to: STUDENT_ROUTES.categories,     label: 'Categories',    icon: Tags },
];

const TOUR_STEPS = [
  { label: 'Dashboard',       title: 'Your money at a glance',        text: 'Jump back here anytime for your balance, income vs. expenses, budgets, and savings progress all in one place.' },
  { label: 'Add Transaction', title: 'Add your first transaction',     text: 'Log income or expenses as they happen. This powers everything — your balance, budgets, reports, and saving tips all come from this.' },
  { label: 'Transactions',    title: 'Review your full history',       text: 'See every transaction you\'ve logged, search through them, and filter by category.' },
  { label: 'Budgets',         title: 'Set a spending limit',           text: 'Cap how much you plan to spend per category each month and get warned before going over.' },
  { label: 'Reports',         title: 'See where your money goes',      text: 'A deeper breakdown of your spending over time — trends, category splits, and exportable monthly reports.' },
  { label: 'Saving Tips',     title: 'Pick up practical money habits', text: 'Bite-sized tips on saving money as a student, tailored to how you spend.' },
  { label: 'AI Assistant',    title: 'Ask for help anytime',           text: 'Ask questions about your spending in plain language and get quick, personalised answers.' },
  { label: 'Categories',      title: 'Manage your categories',         text: 'Customise the categories your transactions get sorted into — rename, add, or remove them.' },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountCloseTimer = useRef<ReturnType<typeof setTimeout>>();
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourAnchorTop, setTourAnchorTop] = useState<number | null>(null);
  const navItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsAccountOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    const key = `campus-coin.dashboardTourSeen.${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* ignore */ }
    const timer = setTimeout(() => setTourStep(0), 800);
    return () => clearTimeout(timer);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (tourStep === null) { setTourAnchorTop(null); return; }
    const el = navItemRefs.current[TOUR_STEPS[tourStep].label];
    setTourAnchorTop(el ? el.getBoundingClientRect().top : null);
  }, [tourStep]);

  function advanceTour() {
    if (tourStep === null) return;
    setTourStep(tourStep + 1 >= TOUR_STEPS.length ? null : tourStep + 1);
  }

  function openAccountPanel() {
    if (accountCloseTimer.current) clearTimeout(accountCloseTimer.current);
    setIsAccountOpen(true);
  }
  function scheduleAccountClose() {
    accountCloseTimer.current = setTimeout(() => setIsAccountOpen(false), 150);
  }

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
          'dark:bg-gray-950',
          isSidebarOpen && 'translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <Link to={STUDENT_ROUTES.dashboard} className="flex items-center gap-2.5">
            <Logo iconClassName="h-7 w-7" wordmarkClassName="text-white text-sm font-bold tracking-tight" />
          </Link>
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
            Menu
          </p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              ref={(el) => { navItemRefs.current[label] = el; }}
              to={to}
              end={end}
              className={({ isActive }) => {
                const active = to === STUDENT_ROUTES.transactions
                  ? isActive && location.pathname !== STUDENT_ROUTES.newTransaction
                  : isActive;
                return cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  'text-gray-400 transition-all duration-150',
                  'hover:bg-white/6 hover:text-gray-100',
                  active
                    ? 'bg-brand-600/20 text-brand-400 font-semibold dark:bg-primary/15 dark:text-primary-accent'
                    : '',
                  tourStep !== null && TOUR_STEPS[tourStep].label === label
                    ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-gray-950'
                    : '',
                );
              }}
            >
              {({ isActive }) => {
                const active = to === STUDENT_ROUTES.transactions
                  ? isActive && location.pathname !== STUDENT_ROUTES.newTransaction
                  : isActive;
                return (
                  <>
                    <span className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                      active
                        ? 'bg-brand-600/30 text-brand-300'
                        : 'text-gray-500 group-hover:text-gray-300',
                    )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{label}</span>
                    {label === 'Add Transaction' && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded bg-brand-600/30 text-brand-400">
                        <Plus className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </>
                );
              }}
            </NavLink>
          ))}

          <div className="mt-2 pt-2 border-t border-white/5 space-y-0.5">
            <p className="px-3 pb-2 pt-1 text-2xs font-semibold uppercase tracking-widest text-gray-500">
              Account
            </p>
            <NavLink
              to={STUDENT_ROUTES.profile}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400',
                  'hover:bg-white/6 hover:text-gray-100 transition-all duration-150',
                  isActive && 'bg-brand-600/20 text-brand-400 font-semibold',
                )
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 group-hover:text-gray-300">
                <User className="h-4 w-4" />
              </span>
              Profile
            </NavLink>
            <NavLink
              to={STUDENT_ROUTES.settings}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400',
                  'hover:bg-white/6 hover:text-gray-100 transition-all duration-150',
                  isActive && 'bg-brand-600/20 text-brand-400 font-semibold',
                )
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 group-hover:text-gray-300">
                <Settings className="h-4 w-4" />
              </span>
              Settings
            </NavLink>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar name={user?.fullName ?? 'Student'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-200">{user?.fullName?.split(' ')[0] ?? 'Student'}</p>
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

      {/* Tour tooltip */}
      {tourStep !== null && tourAnchorTop !== null && (
        <div
          className="fixed left-[15.75rem] z-[60] hidden w-72 -translate-y-1/2 lg:block"
          style={{ top: tourAnchorTop + 18 }}
        >
          <div className="animate-fade-in-up rounded-xl bg-white p-4 shadow-modal ring-1 ring-gray-200 dark:bg-surface-elevated dark:ring-white/10">
            <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">
              {TOUR_STEPS[tourStep].title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-text-secondary">
              {TOUR_STEPS[tourStep].text}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTourStep(null)}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-text-primary"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{tourStep + 1}/{TOUR_STEPS.length}</span>
                <button
                  type="button"
                  onClick={advanceTour}
                  className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 transition-colors dark:bg-primary dark:hover:bg-primary-accent"
                >
                  {tourStep + 1 >= TOUR_STEPS.length ? 'Done ✓' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className={cn(
          'sticky top-0 z-30',
          'flex items-center justify-between gap-4',
          'border-b border-gray-100 bg-white/90 backdrop-blur-md px-4 py-2.5',
          'dark:border-white/5 dark:bg-surface/90',
        )}>
          {/* Mobile: hamburger + logo */}
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

          {/* Desktop: page title area could go here in future */}
          <div className="hidden lg:block" />

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />

            {/* Notifications */}
            <NavLink
              to={STUDENT_ROUTES.notifications}
              className={({ isActive }) =>
                cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                  'dark:text-text-secondary dark:hover:bg-white/8 dark:hover:text-text-primary',
                  isActive && 'bg-gray-100 text-gray-900 dark:bg-white/8 dark:text-text-primary',
                )
              }
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-brand-600 dark:bg-primary-accent">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60" />
                </span>
              )}
            </NavLink>

            {/* AI */}
            <NavLink
              to={STUDENT_ROUTES.insights}
              className={({ isActive }) =>
                cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                  'dark:text-text-secondary dark:hover:bg-white/8 dark:hover:text-text-primary',
                  isActive && 'bg-gray-100 text-gray-900 dark:bg-white/8 dark:text-text-primary',
                )
              }
              aria-label="AI Assistant"
            >
              <Sparkles className="h-4 w-4" />
            </NavLink>

            <div className="mx-1.5 h-4 w-px bg-gray-200 dark:bg-white/8" />

            {/* Account dropdown */}
            <div
              className="relative"
              onMouseEnter={openAccountPanel}
              onMouseLeave={scheduleAccountClose}
            >
              <NavLink
                to={STUDENT_ROUTES.profile}
                onFocus={openAccountPanel}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-white/8',
                    isActive && 'bg-gray-100 dark:bg-white/8',
                  )
                }
              >
                <Avatar name={user?.fullName ?? 'Student'} size="sm" />
                <span className="hidden text-sm font-medium text-gray-700 dark:text-text-secondary sm:block">
                  {user?.fullName?.split(' ')[0] ?? 'Student'}
                </span>
                <ChevronDown className="hidden h-3 w-3 text-gray-400 sm:block" />
              </NavLink>

              {isAccountOpen && (
                <div
                  onMouseEnter={openAccountPanel}
                  onMouseLeave={scheduleAccountClose}
                  className={cn(
                    'animate-scale-in absolute right-0 top-full mt-1.5 z-20',
                    'w-52 rounded-xl border border-gray-100 bg-white p-1.5',
                    'shadow-panel dark:border-white/8 dark:bg-surface-elevated dark:shadow-dark-panel',
                  )}
                >
                  <div className="px-3 py-2 border-b border-gray-50 dark:border-white/5 mb-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">
                      {user?.fullName ?? 'Student'}
                    </p>
                    <p className="truncate text-xs text-gray-400 dark:text-text-muted">{user?.email}</p>
                  </div>
                  {[
                    { to: STUDENT_ROUTES.profile,  icon: User,     label: 'View Profile' },
                    { to: STUDENT_ROUTES.settings, icon: Settings, label: 'Settings' },
                  ].map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:text-text-secondary dark:hover:bg-white/5"
                    >
                      <Icon className="h-4 w-4 text-gray-400 dark:text-text-muted" />
                      {label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-gray-50 dark:border-white/5" />
                  <button
                    type="button"
                    onClick={() => void logout().then(() => navigate('/'))}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-500/8"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}
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
