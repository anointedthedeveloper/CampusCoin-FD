import { Suspense } from 'react';
import { lazyWithRetry } from '@/utils/lazyWithRetry';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { PUBLIC_ROUTES, STUDENT_ROUTES, ADMIN_ROUTES } from '@/constants/routes';
import { ErrorBoundary, PageLoader } from '@/components/common';

const AboutPage = lazyWithRetry(() =>
  import('@/pages/public/AboutPage').then((page) => ({ default: page.AboutPage })),
);
const FaqPage = lazyWithRetry(() =>
  import('@/pages/public/FaqPage').then((page) => ({ default: page.FaqPage })),
);
const FeaturesPage = lazyWithRetry(() =>
  import('@/pages/public/FeaturesPage').then((page) => ({ default: page.FeaturesPage })),
);
const HelpPage = lazyWithRetry(() =>
  import('@/pages/public/HelpPage').then((page) => ({ default: page.HelpPage })),
);
const HomePage = lazyWithRetry(() =>
  import('@/pages/public/HomePage').then((page) => ({ default: page.HomePage })),
);
const NotFoundPage = lazyWithRetry(() =>
  import('@/pages/public/NotFoundPage').then((page) => ({ default: page.NotFoundPage })),
);

const AdminLoginPage = lazyWithRetry(() =>
  import('@/pages/auth/AdminLoginPage').then((page) => ({ default: page.AdminLoginPage })),
);
const ForgotPasswordPage = lazyWithRetry(() =>
  import('@/pages/auth/ForgotPasswordPage').then((page) => ({ default: page.ForgotPasswordPage })),
);
const LoginPage = lazyWithRetry(() =>
  import('@/pages/auth/LoginPage').then((page) => ({ default: page.LoginPage })),
);
const SetPasswordPage = lazyWithRetry(() =>
  import('@/pages/auth/SetPasswordPage').then((page) => ({ default: page.SetPasswordPage })),
);
const RegisterPage = lazyWithRetry(() =>
  import('@/pages/auth/RegisterPage').then((page) => ({ default: page.RegisterPage })),
);

const OnboardingPage = lazyWithRetry(() =>
  import('@/pages/onboarding').then((page) => ({ default: page.OnboardingPage })),
);

const BookmarksPage = lazyWithRetry(() =>
  import('@/pages/student/BookmarksPage').then((page) => ({ default: page.BookmarksPage })),
);
const BudgetsPage = lazyWithRetry(() =>
  import('@/pages/student/BudgetsPage').then((page) => ({ default: page.BudgetsPage })),
);
const CategoriesPage = lazyWithRetry(() =>
  import('@/pages/student/CategoriesPage').then((page) => ({ default: page.CategoriesPage })),
);
const DashboardPage = lazyWithRetry(() =>
  import('@/pages/student/DashboardPage').then((page) => ({ default: page.DashboardPage })),
);
const ImportPage = lazyWithRetry(() =>
  import('@/pages/student/ImportPage').then((page) => ({ default: page.ImportPage })),
);
const InsightsPage = lazyWithRetry(() =>
  import('@/pages/student/InsightsPage').then((page) => ({ default: page.InsightsPage })),
);
const MonthlyReportPage = lazyWithRetry(() =>
  import('@/pages/student/MonthlyReportPage').then((page) => ({ default: page.MonthlyReportPage })),
);
const NotificationsPage = lazyWithRetry(() =>
  import('@/pages/student/NotificationsPage').then((page) => ({ default: page.NotificationsPage })),
);
const ProfilePage = lazyWithRetry(() =>
  import('@/pages/student/ProfilePage').then((page) => ({ default: page.ProfilePage })),
);
const RecurringPage = lazyWithRetry(() =>
  import('@/pages/student/RecurringPage').then((page) => ({ default: page.RecurringPage })),
);
const ReportsPage = lazyWithRetry(() =>
  import('@/pages/student/ReportsPage').then((page) => ({ default: page.ReportsPage })),
);
const SavingTipsPage = lazyWithRetry(() =>
  import('@/pages/student/SavingTipsPage').then((page) => ({ default: page.SavingTipsPage })),
);
const SavingsGoalsPage = lazyWithRetry(() =>
  import('@/pages/student/SavingsGoalsPage').then((page) => ({ default: page.SavingsGoalsPage })),
);
const SettingsPage = lazyWithRetry(() =>
  import('@/pages/student/SettingsPage').then((page) => ({ default: page.SettingsPage })),
);
const TransactionDetailPage = lazyWithRetry(() =>
  import('@/pages/student/TransactionDetailPage').then((page) => ({
    default: page.TransactionDetailPage,
  })),
);
const TransactionEditPage = lazyWithRetry(() =>
  import('@/pages/student/TransactionEditPage').then((page) => ({
    default: page.TransactionEditPage,
  })),
);
const TransactionNewPage = lazyWithRetry(() =>
  import('@/pages/student/TransactionNewPage').then((page) => ({
    default: page.TransactionNewPage,
  })),
);
const TransactionsListPage = lazyWithRetry(() =>
  import('@/pages/student/TransactionsListPage').then((page) => ({
    default: page.TransactionsListPage,
  })),
);

const AdminAnnouncementsPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminAnnouncementsPage').then((page) => ({
    default: page.AdminAnnouncementsPage,
  })),
);
const AdminCategoriesPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminCategoriesPage').then((page) => ({
    default: page.AdminCategoriesPage,
  })),
);
const AdminDashboardPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminDashboardPage').then((page) => ({ default: page.AdminDashboardPage })),
);
const AdminStatisticsPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminStatisticsPage').then((page) => ({
    default: page.AdminStatisticsPage,
  })),
);
const AdminUserDetailPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminUserDetailPage').then((page) => ({
    default: page.AdminUserDetailPage,
  })),
);
const AdminSupportPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminSupportPage').then((page) => ({ default: page.AdminSupportPage })),
);
const AdminSystemPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminSystemPage').then((page) => ({ default: page.AdminSystemPage })),
);
const AdminProfilePage = lazyWithRetry(() =>
  import('@/pages/admin/AdminProfilePage').then((page) => ({ default: page.AdminProfilePage })),
);
const AdminUsersPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminUsersPage').then((page) => ({ default: page.AdminUsersPage })),
);

export function AppRoutes() {
  const location = useLocation();
  return (
    // resetKey clears a caught error on navigation so it doesn't stick to other pages.
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public marketing + informational pages */}
        <Route element={<PublicLayout />}>
          <Route path={PUBLIC_ROUTES.home} element={<HomePage />} />
          <Route path={PUBLIC_ROUTES.about} element={<AboutPage />} />
          <Route path={PUBLIC_ROUTES.features} element={<FeaturesPage />} />
          <Route path={PUBLIC_ROUTES.faq} element={<FaqPage />} />
          <Route path={PUBLIC_ROUTES.help} element={<HelpPage />} />
          <Route path="/contact" element={<Navigate to={`${PUBLIC_ROUTES.help}#contact`} replace />} />
        </Route>

        {/* Auth flows */}
        <Route element={<AuthLayout />}>
          <Route path={PUBLIC_ROUTES.login} element={<LoginPage />} />
          <Route path={PUBLIC_ROUTES.adminLogin} element={<AdminLoginPage />} />
          <Route path={PUBLIC_ROUTES.register} element={<RegisterPage />} />
          <Route path={PUBLIC_ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path={PUBLIC_ROUTES.setPassword} element={<SetPasswordPage />} />
          </Route>
        </Route>

        {/* Student application (requires authentication) */}
        <Route element={<ProtectedRoute />}>
          {/* Standalone, one-time setup flow — deliberately outside StudentLayout (no sidebar) */}
          <Route path={STUDENT_ROUTES.onboarding} element={<OnboardingPage />} />

          <Route element={<StudentLayout />}>
            <Route path={STUDENT_ROUTES.dashboard} element={<DashboardPage />} />
            <Route path={STUDENT_ROUTES.transactions} element={<TransactionsListPage />} />
            <Route path={STUDENT_ROUTES.newTransaction} element={<TransactionNewPage />} />
            <Route path={STUDENT_ROUTES.transactionDetail} element={<TransactionDetailPage />} />
            <Route path={STUDENT_ROUTES.editTransaction} element={<TransactionEditPage />} />
            <Route path={STUDENT_ROUTES.categories} element={<CategoriesPage />} />
            <Route path={STUDENT_ROUTES.budgets} element={<BudgetsPage />} />
            <Route path={STUDENT_ROUTES.reports} element={<ReportsPage />} />
            <Route path={STUDENT_ROUTES.monthlyReport} element={<MonthlyReportPage />} />
            <Route path={STUDENT_ROUTES.insights} element={<InsightsPage />} />
            <Route path={STUDENT_ROUTES.savingTips} element={<SavingTipsPage />} />
            <Route path={STUDENT_ROUTES.savingsGoals} element={<SavingsGoalsPage />} />
            <Route path={STUDENT_ROUTES.bookmarks} element={<BookmarksPage />} />
            <Route path={STUDENT_ROUTES.import} element={<ImportPage />} />
            <Route path={STUDENT_ROUTES.profile} element={<ProfilePage />} />
            <Route path={STUDENT_ROUTES.settings} element={<SettingsPage />} />
            <Route path={STUDENT_ROUTES.notifications} element={<NotificationsPage />} />
            <Route path={STUDENT_ROUTES.recurring} element={<RecurringPage />} />
            <Route path={STUDENT_ROUTES.help} element={<HelpPage inApp />} />
          </Route>

          {/* Admin console (requires authentication + admin role) */}
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path={ADMIN_ROUTES.dashboard} element={<AdminDashboardPage />} />
              <Route path={ADMIN_ROUTES.users} element={<AdminUsersPage />} />
              <Route path={ADMIN_ROUTES.userDetail} element={<AdminUserDetailPage />} />
              <Route path={ADMIN_ROUTES.categories} element={<AdminCategoriesPage />} />
              <Route path={ADMIN_ROUTES.announcements} element={<AdminAnnouncementsPage />} />
              <Route path={ADMIN_ROUTES.statistics} element={<AdminStatisticsPage />} />
              <Route path={ADMIN_ROUTES.profile} element={<AdminProfilePage />} />
              <Route path={ADMIN_ROUTES.support} element={<AdminSupportPage />} />
              <Route path={ADMIN_ROUTES.system} element={<AdminSystemPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
