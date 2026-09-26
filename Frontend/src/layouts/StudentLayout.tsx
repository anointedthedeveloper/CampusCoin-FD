import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
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
  { to: STUDENT_ROUTES.newTransaction, label: 'Add Transaction', icon: Plus, end: true },
  { to: STUDENT_ROUTES.transactions, label: 'Transactions', icon: Receipt },
  { to: STUDENT_ROUTES.budgets, label: 'Budgets', icon: Wallet },
  { to: STUDENT_ROUTES.reports, label: 'Reports', icon: BarChart3 },
  { to: STUDENT_ROUTES.savingTips, label: 'Saving Tips', icon: PiggyBank },
  { to: STUDENT_ROUTES.insights, label: 'AI Assistant', icon: Bot },
  { to: STUDENT_ROUTES.categories, label: 'Categories', icon: Tags },
];

// A one-time "click here" walkthrough of the sidebar for first-time visitors.
// Anchored to real nav items (via itemRefs) rather than fixed coordinates, so
// it stays correctly positioned regardless of viewport size or future nav
// changes. Desktop-only (the sidebar lives off-screen behind a hamburger on
// mobile, so there's nothing to point at there) — gated at start time rather
// than skipped silently, so a mobile-only visitor still gets it the first
// time they open the app on a wider screen.
const TOUR_STEPS = [
  { label: 'Dashboard', title: 'Your money at a glance', text: 'Click here anytime to jump back to your overview — balance, income vs. expenses, budgets, and savings progress all in one place.' },
  { label: 'Add Transaction', title: 'Add your first transaction', text: 'Click here to log income or expenses as they happen. This is what powers everything else — your balance, budgets, reports, and saving tips all come from this.' },
  { label: 'Transactions', title: 'Review your full history', text: 'Click here to see every transaction you’ve logged, search through them, and filter by category when you need to find something specific.' },
  { label: 'Budgets', title: 'Set a spending limit', text: 'Click here to cap how much you plan to spend per category each month, and get warned before you actually go over that limit.' },
  { label: 'Reports', title: 'See where your money goes', text: 'Click here for a deeper breakdown of your spending over time — trends, category splits, and exportable monthly reports.' },
  { label: 'Saving Tips', title: 'Pick up practical money habits', text: 'Click here for bite-sized tips on saving money as a student, tailored to how you spend.' },
  { label: 'AI Assistant', title: 'Ask for help anytime', text: 'Click here to ask questions about your spending in plain language and get quick, personalized answers.' },
  { label: 'Categories', title: 'Manage your finance categories', text: 'Click here to customize the categories your transactions get sorted into — rename, add, or remove them to match how you actually spend.' },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
    } catch {
      // ignore storage access failures (e.g. private browsing)
    }
    const timer = setTimeout(() => setTourStep(0), 700);
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

  // Small delay before closing so moving the cursor from the trigger to the
  // panel (there's a gap between them) doesn't dismiss it mid-hover.
  function openAccountPanel() {
    if (accountCloseTimer.current) clearTimeout(accountCloseTimer.current);
    setIsAccountOpen(true);
  }
  function scheduleAccountClose() {
    accountCloseTimer.current = setTimeout(() => setIsAccountOpen(false), 150);
  }

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
          // Fixed + slide-in on mobile (a drawer over the content); on large
          // screens it switches to sticky rather than static, so it stays
          // pinned in the viewport as `main` scrolls instead of scrolling
          // away with the page — `static` let it scroll off with the rest
          // of the document on any page taller than one screen.
          'fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 -translate-x-full flex-col bg-brand-950 text-brand-100 transition-transform duration-300 ease-out dark:bg-surface lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
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
              ref={(el) => { navItemRefs.current[label] = el; }}
              to={to}
              end={end}
              className={({ isActive }) => {
                // "Transactions" would otherwise prefix-match /transactions/new
                // too, lighting up both it and the separate "Add Transaction"
                // item at once — only the latter should be active there.
                const active = to === STUDENT_ROUTES.transactions
                  ? isActive && location.pathname !== STUDENT_ROUTES.newTransaction
                  : isActive;
                return cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100/75 transition-all duration-200 hover:bg-white/10 hover:text-white',
                  active && 'bg-brand-600 text-white shadow-sm',
                  tourStep !== null && TOUR_STEPS[tourStep].label === label && 'ring-2 ring-primary-accent ring-offset-2 ring-offset-brand-950',
                );
              }}
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

      {tourStep !== null && tourAnchorTop !== null && (
        <div
          className="fixed left-[15.5rem] z-[60] hidden w-80 -translate-y-1/2 lg:block"
          style={{ top: tourAnchorTop + 20 }}
        >
          <div className="animate-fade-in-up rounded-xl bg-gray-900 p-4 text-white shadow-xl shadow-black/30 dark:bg-surface-elevated dark:ring-1 dark:ring-white/10">
            <p className="text-sm font-semibold">{TOUR_STEPS[tourStep].title}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-300 dark:text-text-secondary">{TOUR_STEPS[tourStep].text}</p>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTourStep(null)}
                className="text-xs font-medium text-gray-400 transition-colors hover:text-white dark:text-text-muted dark:hover:text-text-primary"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-text-muted">{tourStep + 1}/{TOUR_STEPS.length}</span>
                <button
                  type="button"
                  onClick={advanceTour}
                  className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:bg-primary-accent dark:text-background dark:hover:bg-primary"
                >
                  {tourStep + 1 >= TOUR_STEPS.length ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              className={({ isActive }) =>
                cn(
                  'group relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-brand-600 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-primary-accent',
                  isActive && 'bg-brand-50 text-brand-600 dark:bg-white/10 dark:text-primary-accent',
                )
              }
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
              className={({ isActive }) =>
                cn(
                  'group relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-brand-600 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-primary-accent',
                  isActive && 'bg-brand-50 text-brand-600 dark:bg-white/10 dark:text-primary-accent',
                )
              }
              aria-label="AI Assistant"
            >
              <Bot className="h-5 w-5" />
              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Any questions?
              </span>
            </NavLink>

            <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-white/10" />

            {/* Account — click still goes straight to Profile; hovering (or
                tapping on touch, via focus-within) opens a quick panel with
                shortcuts, so the header itself has a way to reach Settings
                and Log Out without a trip to the sidebar. */}
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
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/10',
                    isActive && 'bg-gray-100 dark:bg-white/10',
                  )
                }
              >
                <Avatar name={user?.fullName ?? 'Student'} size="sm" />
                <span className="hidden text-sm font-medium text-gray-700 dark:text-text-secondary sm:inline">
                  {user?.fullName?.split(' ')[0] ?? 'Student'}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 dark:text-text-muted sm:inline" />
              </NavLink>

              {isAccountOpen && (
                <div
                  onMouseEnter={openAccountPanel}
                  onMouseLeave={scheduleAccountClose}
                  className="animate-fade-in-up absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-surface-elevated dark:shadow-black/40"
                >
                  <div className="border-b border-gray-100 px-3 py-2 dark:border-white/10">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{user?.fullName ?? 'Student'}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-text-secondary">{user?.email}</p>
                  </div>
                  <Link
                    to={STUDENT_ROUTES.profile}
                    className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/10"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    View Profile
                  </Link>
                  <Link
                    to={STUDENT_ROUTES.settings}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/10"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout().then(() => navigate('/'))}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
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
