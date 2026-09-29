import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  ChevronRight,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Plus,
  Receipt,
  Repeat,
  Settings,
  Sparkles,
  Tags,
  Target,
  User,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { STUDENT_ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Logo, ThemeToggle } from '@/components/common';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/utils/cn';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
interface NavGroup { id: string; label: string; items: NavItem[] }

// Grouped so the menu stays short and scannable; each group can be folded.
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: STUDENT_ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: STUDENT_ROUTES.insights, label: 'AI Assistant', icon: Bot },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    items: [
      { to: STUDENT_ROUTES.newTransaction, label: 'Add Transaction', icon: Plus, end: true },
      { to: STUDENT_ROUTES.transactions, label: 'Transactions', icon: Receipt },
      { to: STUDENT_ROUTES.recurring, label: 'Recurring', icon: Repeat },
      { to: STUDENT_ROUTES.import, label: 'Import & Export', icon: FileUp },
      { to: STUDENT_ROUTES.categories, label: 'Categories', icon: Tags },
    ],
  },
  {
    id: 'plan',
    label: 'Plan & track',
    items: [
      { to: STUDENT_ROUTES.budgets, label: 'Budgets', icon: Wallet },
      { to: STUDENT_ROUTES.savingsGoals, label: 'Savings Goals', icon: Target },
      { to: STUDENT_ROUTES.savingTips, label: 'Saving Tips', icon: PiggyBank },
      { to: STUDENT_ROUTES.reports, label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { to: STUDENT_ROUTES.profile, label: 'Profile', icon: User },
      { to: STUDENT_ROUTES.settings, label: 'Settings', icon: Settings },
      { to: STUDENT_ROUTES.help, label: 'Help & Support', icon: LifeBuoy },
    ],
  },
];

const QUICK_ADD = [
  { to: `${STUDENT_ROUTES.newTransaction}?type=expense`, label: 'Add an expense', hint: 'Food, transport, data…', icon: ArrowDownRight, tone: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400' },
  { to: `${STUDENT_ROUTES.newTransaction}?type=income`, label: 'Add income', hint: 'Allowance, job, gift…', icon: ArrowUpRight, tone: 'text-brand-700 bg-brand-50 dark:bg-primary/15 dark:text-primary-accent' },
  { to: `${STUDENT_ROUTES.budgets}?new=1`, label: 'Set a budget', hint: 'Cap a category this month', icon: Wallet, tone: 'text-amber-700 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-400' },
  { to: `${STUDENT_ROUTES.savingsGoals}?new=1`, label: 'New savings goal', hint: 'Laptop, trip, emergency fund', icon: Target, tone: 'text-teal-700 bg-teal-50 dark:bg-teal-400/10 dark:text-teal-400' },
  { to: STUDENT_ROUTES.import, label: 'Import a file', hint: 'CSV, Excel, Word or JSON', icon: FileUp, tone: 'text-blue-700 bg-blue-50 dark:bg-blue-400/10 dark:text-blue-400' },
];

const TOUR_STEPS = [
  { label: 'Dashboard', title: 'Your money at a glance', text: 'Balance, income, expenses, budgets, and savings — all here.' },
  { label: 'Add Transaction', title: 'Log as you go', text: 'Add income or expenses in seconds. Everything else updates automatically.' },
  { label: 'Budgets', title: 'Set spending limits', text: 'Cap spending per category each month and get warned before you go over.' },
  { label: 'AI Assistant', title: 'Ask anything', text: 'Ask about your spending in plain language — it can even add things for you once you approve.' },
];

const ROUTE_LABELS: Record<string, string> = {
  [STUDENT_ROUTES.dashboard]: 'Dashboard',
  [STUDENT_ROUTES.transactions]: 'Transactions',
  [STUDENT_ROUTES.newTransaction]: 'Add Transaction',
  [STUDENT_ROUTES.recurring]: 'Recurring',
  [STUDENT_ROUTES.categories]: 'Categories',
  [STUDENT_ROUTES.budgets]: 'Budgets',
  [STUDENT_ROUTES.reports]: 'Reports',
  [STUDENT_ROUTES.insights]: 'AI Assistant',
  [STUDENT_ROUTES.savingTips]: 'Saving Tips',
  [STUDENT_ROUTES.savingsGoals]: 'Savings Goals',
  [STUDENT_ROUTES.bookmarks]: 'Pinned Tips',
  [STUDENT_ROUTES.import]: 'Import & Export',
  [STUDENT_ROUTES.profile]: 'Profile',
  [STUDENT_ROUTES.settings]: 'Settings',
  [STUDENT_ROUTES.help]: 'Help & Support',
  [STUDENT_ROUTES.notifications]: 'Notifications',
  [STUDENT_ROUTES.onboarding]: 'Money profile',
};

// Parent pages for routes that live "under" another section.
const ROUTE_PARENTS: Record<string, string> = {
  [STUDENT_ROUTES.newTransaction]: STUDENT_ROUTES.transactions,
  [STUDENT_ROUTES.import]: STUDENT_ROUTES.transactions,
  [STUDENT_ROUTES.bookmarks]: STUDENT_ROUTES.savingTips,
  [STUDENT_ROUTES.onboarding]: STUDENT_ROUTES.profile,
};

const COLLAPSE_KEY = 'campus-coin.sidebarCollapsed';
const GROUPS_KEY = 'campus-coin.sidebarGroupsClosed';

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures (e.g. private browsing)
  }
}

function Breadcrumbs({ pathname, className }: { pathname: string; className?: string }) {
  const crumbs: { to: string; label: string }[] = [];
  if (ROUTE_LABELS[pathname]) {
    const parent = ROUTE_PARENTS[pathname];
    if (parent) crumbs.push({ to: parent, label: ROUTE_LABELS[parent] });
    crumbs.push({ to: pathname, label: ROUTE_LABELS[pathname] });
  } else if (pathname.startsWith(`${STUDENT_ROUTES.transactions}/`)) {
    crumbs.push({ to: STUDENT_ROUTES.transactions, label: 'Transactions' });
    crumbs.push({ to: pathname, label: pathname.endsWith('/edit') ? 'Edit' : 'Details' });
  }
  if (pathname !== STUDENT_ROUTES.dashboard) crumbs.unshift({ to: STUDENT_ROUTES.dashboard, label: 'Home' });

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className ?? 'hidden lg:block')}>
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.to} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-text-muted" aria-hidden="true" />}
              {isLast ? (
                <span aria-current="page" className="truncate font-semibold text-gray-900 dark:text-text-primary">{crumb.label}</span>
              ) : (
                <Link to={crumb.to} className="truncate text-gray-500 hover:text-brand-700 dark:text-text-muted dark:hover:text-primary-accent">{crumb.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** A header control that opens its panel on hover (desktop) or click (touch). */
function HoverMenu({ trigger, children, align = 'right', label }: { trigger: ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 160); };

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} onFocus={show} className="rounded-lg">
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'animate-scale-in absolute top-full z-40 mt-1.5 rounded-xl border border-gray-100 bg-white p-1.5 shadow-panel dark:border-white/[0.08] dark:bg-surface-elevated dark:shadow-dark-panel',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => readStored(COLLAPSE_KEY, false));
  const [closedGroups, setClosedGroups] = useState<string[]>(() => readStored(GROUPS_KEY, []));
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourAnchorTop, setTourAnchorTop] = useState<number | null>(null);
  const navItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Icon-only rail applies on desktop; the mobile drawer is always full width.
  const rail = collapsed && !isSidebarOpen;

  useEffect(() => {
    setIsSidebarOpen(false);
    setTooltip(null);
  }, [location.pathname, location.search]);

  useEffect(() => { writeStored(COLLAPSE_KEY, collapsed); }, [collapsed]);
  useEffect(() => { writeStored(GROUPS_KEY, closedGroups); }, [closedGroups]);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    const key = `campus-coin.dashboardTourSeen.${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* ignore */ }
    const timer = setTimeout(() => { setCollapsed(false); setClosedGroups([]); setTourStep(0); }, 800);
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

  function isItemActive(item: NavItem) {
    if (item.to === STUDENT_ROUTES.transactions) {
      return location.pathname.startsWith(STUDENT_ROUTES.transactions) && location.pathname !== STUDENT_ROUTES.newTransaction;
    }
    if (item.to === STUDENT_ROUTES.savingTips) return location.pathname === item.to || location.pathname === STUDENT_ROUTES.bookmarks;
    return item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
  }

  function toggleGroup(id: string) {
    setClosedGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  return (
    <div className="flex min-h-screen bg-gray-50/80 dark:bg-background">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-[100dvh] shrink-0 -translate-x-full flex-col bg-brand-950 text-gray-100',
          'transition-[transform,width] duration-300 ease-spring',
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          rail ? 'w-[15rem] lg:w-[4.5rem]' : 'w-[15rem]',
          isSidebarOpen && 'translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={cn('flex items-center border-b border-white/5 py-4', rail ? 'justify-center px-2' : 'justify-between px-4')}>
          <Link to={STUDENT_ROUTES.dashboard} className="flex items-center gap-2.5" aria-label="Campus Coin dashboard">
            <Logo showWordmark={!rail} iconClassName="h-7 w-7" wordmarkClassName="text-white text-sm font-bold tracking-tight" />
          </Link>
          <button type="button" onClick={() => setIsSidebarOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav — scrolls on short screens */}
        <nav className="student-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 [scrollbar-width:thin]" onScroll={() => setTooltip(null)}>
          {NAV_GROUPS.map((group) => {
            const groupActive = group.items.some(isItemActive);
            const isOpen = rail || groupActive || !closedGroups.includes(group.id);
            return (
              <div key={group.id} className="mb-1">
                {rail ? (
                  <div className="mx-2 my-2 border-t border-white/5 first:hidden" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between rounded-md px-3 pb-1.5 pt-2 text-2xs font-semibold uppercase tracking-widest text-gray-500 hover:text-gray-300"
                  >
                    {group.label}
                    <ChevronDown className={cn('h-3 w-3 transition-transform', !isOpen && '-rotate-90')} aria-hidden="true" />
                  </button>
                )}
                {isOpen && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      const Icon = item.icon;
                      const inTour = tourStep !== null && TOUR_STEPS[tourStep].label === item.label;
                      return (
                        <NavLink
                          key={item.label}
                          ref={(el) => { navItemRefs.current[item.label] = el; }}
                          to={item.to}
                          end={item.end}
                          aria-label={rail ? item.label : undefined}
                          aria-current={active ? 'page' : undefined}
                          onMouseEnter={(e) => { if (rail) setTooltip({ label: item.label, top: e.currentTarget.getBoundingClientRect().top + 16 }); }}
                          onMouseLeave={() => setTooltip(null)}
                          onFocus={(e) => { if (rail) setTooltip({ label: item.label, top: e.currentTarget.getBoundingClientRect().top + 16 }); }}
                          onBlur={() => setTooltip(null)}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg text-sm font-medium text-gray-400 transition-all duration-150 hover:bg-white/[0.06] hover:text-gray-100',
                            rail ? 'justify-center px-0 py-2' : 'px-3 py-2 [@media(max-height:760px)]:py-1',
                            active && 'bg-brand-600/20 font-semibold text-brand-400 dark:bg-primary/15 dark:text-primary-accent',
                            inTour && 'ring-2 ring-brand-400 ring-offset-2 ring-offset-gray-950',
                          )}
                        >
                          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors', active ? 'bg-brand-600/30 text-brand-300' : 'text-gray-500 group-hover:text-gray-300')}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {!rail && <span className="truncate">{item.label}</span>}
                          {!rail && item.label === 'Add Transaction' && (
                            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded bg-brand-600/30 text-brand-400">
                              <Plus className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden border-t border-white/5 px-2 py-2 lg:block">
          <button
            type="button"
            onClick={() => { setCollapsed((c) => !c); setTooltip(null); }}
            className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-100', rail && 'justify-center px-0')}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {rail ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse sidebar</>}
          </button>
        </div>

        {/* User footer */}
        <div className={cn('border-t border-white/5 py-3', rail ? 'px-2' : 'px-3')}>
          <div className={cn('flex items-center gap-2.5 rounded-lg py-2', rail ? 'flex-col px-0' : 'px-2')}>
            <Avatar name={user?.fullName ?? 'Student'} size="sm" />
            {!rail && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-200">{user?.fullName?.split(' ')[0] ?? 'Student'}</p>
                <p className="truncate text-2xs text-gray-500">{user?.email}</p>
              </div>
            )}
            <button
              onClick={() => void logout().then(() => navigate('/'))}
              className="shrink-0 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-gray-200"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Rail tooltip (fixed so the scrolling nav can't clip it) */}
      {rail && tooltip && (
        <div className="pointer-events-none fixed left-[5rem] z-[60] hidden -translate-y-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg lg:block dark:bg-surface-elevated" style={{ top: tooltip.top }} role="tooltip">
          {tooltip.label}
        </div>
      )}

      {/* Tour tooltip */}
      {tourStep !== null && tourAnchorTop !== null && (
        <div className={cn('fixed z-[60] hidden w-72 -translate-y-1/2 lg:block', rail ? 'left-[5.25rem]' : 'left-[15.75rem]')} style={{ top: tourAnchorTop + 18 }}>
          <div className="animate-fade-in-up rounded-xl bg-white p-4 shadow-modal ring-1 ring-gray-200 dark:bg-surface-elevated dark:ring-white/10">
            <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{TOUR_STEPS[tourStep].title}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-text-secondary">{TOUR_STEPS[tourStep].text}</p>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={() => setTourStep(null)} className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-text-primary">Skip tour</button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{tourStep + 1}/{TOUR_STEPS.length}</span>
                <button type="button" onClick={advanceTour} className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent">
                  {tourStep + 1 >= TOUR_STEPS.length ? 'Done ✓' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/90 px-3 py-2.5 backdrop-blur-md dark:border-white/5 dark:bg-surface/90 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile: hamburger + logo */}
            <button type="button" onClick={() => setIsSidebarOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/[0.08] lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Link to={STUDENT_ROUTES.dashboard} className="lg:hidden" aria-label="Dashboard"><Logo showWordmark={false} iconClassName="h-7 w-7" /></Link>
            {/* Desktop: sidebar toggle + breadcrumbs */}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/[0.08] lg:flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <Breadcrumbs pathname={location.pathname} />
          </div>

          <div className="flex items-center gap-1">
            {/* Quick add */}
            <HoverMenu
              label="Quick add"
              trigger={
                <span className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent sm:px-3">
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span> <ChevronDown className="hidden h-3 w-3 opacity-80 sm:block" />
                </span>
              }
            >
              {() => (
                <div className="w-64">
                  {QUICK_ADD.map(({ to, label, hint, icon: Icon, tone }) => (
                    <Link key={label} to={to} role="menuitem" className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone)}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-text-primary">{label}</span>
                        <span className="block truncate text-xs text-gray-500 dark:text-text-muted">{hint}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </HoverMenu>

            <ThemeToggle />

            <NavLink
              to={STUDENT_ROUTES.notifications}
              className={({ isActive }) => cn(
                'relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/[0.08] dark:hover:text-text-primary',
                isActive && 'bg-gray-100 text-gray-900 dark:bg-white/[0.08] dark:text-text-primary',
              )}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-surface" aria-hidden="true">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <NavLink
              to={STUDENT_ROUTES.insights}
              className={({ isActive }) => cn(
                'hidden h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/[0.08] dark:hover:text-text-primary sm:flex',
                isActive && 'bg-gray-100 text-gray-900 dark:bg-white/[0.08] dark:text-text-primary',
              )}
              aria-label="AI Assistant"
              title="AI Assistant"
            >
              <Sparkles className="h-4 w-4" />
            </NavLink>

            <div className="mx-1 hidden h-4 w-px bg-gray-200 dark:bg-white/[0.08] sm:block" />

            {/* Account menu */}
            <HoverMenu
              label="Account menu"
              trigger={
                <span className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.08]">
                  <Avatar name={user?.fullName ?? 'Student'} size="sm" />
                  <span className="hidden text-sm font-medium text-gray-700 dark:text-text-secondary md:block">{user?.fullName?.split(' ')[0] ?? 'Student'}</span>
                  <ChevronDown className="hidden h-3 w-3 text-gray-400 md:block" />
                </span>
              }
            >
              {() => (
                <div className="w-56">
                  <div className="mb-1 border-b border-gray-50 px-3 py-2 dark:border-white/5">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{user?.fullName ?? 'Student'}</p>
                    <p className="truncate text-xs text-gray-400 dark:text-text-muted">{user?.email}</p>
                  </div>
                  {[
                    { to: STUDENT_ROUTES.profile, icon: User, label: 'Profile' },
                    { to: STUDENT_ROUTES.settings, icon: Settings, label: 'Settings & backups' },
                    { to: STUDENT_ROUTES.help, icon: HelpCircle, label: 'Help & support' },
                  ].map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-text-secondary dark:hover:bg-white/5">
                      <Icon className="h-4 w-4 text-gray-400 dark:text-text-muted" />
                      {label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-gray-50 dark:border-white/5" />
                  <button type="button" role="menuitem" onClick={() => void logout().then(() => navigate('/'))} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/[0.08]">
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </HoverMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:px-8">
          {location.pathname !== STUDENT_ROUTES.dashboard && (
            <Breadcrumbs pathname={location.pathname} className="mb-3 lg:hidden [&_ol]:text-xs" />
          )}
          <Outlet />
        </main>
        <footer className="px-4 pb-5 pt-2 text-center text-[11px] text-gray-400 dark:text-text-muted sm:px-6">
          Campus Coin · Made by <span className="font-semibold text-brand-700 dark:text-primary-accent">Team Flandek</span> · AI answers are advisory, not financial advice.
        </footer>
      </div>
    </div>
  );
}
