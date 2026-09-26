import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { PUBLIC_ROUTES, STUDENT_ROUTES, ADMIN_ROUTES } from '@/constants/routes';
import { PageLoader } from '@/components/common';

const AboutPage = lazy(() =>
  import('@/pages/public/AboutPage').then((page) => ({ default: page.AboutPage })),
);
const FaqPage = lazy(() =>
  import('@/pages/public/FaqPage').then((page) => ({ default: page.FaqPage })),
);
const FeaturesPage = lazy(() =>
  import('@/pages/public/FeaturesPage').then((page) => ({ default: page.FeaturesPage })),
);
const HomePage = lazy(() =>
  import('@/pages/public/HomePage').then((page) => ({ default: page.HomePage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/public/NotFoundPage').then((page) => ({ default: page.NotFoundPage })),
);

const AdminLoginPage = lazy(() =>
  import('@/pages/auth/AdminLoginPage').then((page) => ({ default: page.AdminLoginPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((page) => ({ default: page.ForgotPasswordPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((page) => ({ default: page.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((page) => ({ default: page.RegisterPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((page) => ({ default: page.ResetPasswordPage })),
);

const OnboardingPage = lazy(() =>
  import('@/pages/onboarding').then((page) => ({ default: page.OnboardingPage })),
);

const BookmarksPage = lazy(() =>
  import('@/pages/student/BookmarksPage').then((page) => ({ default: page.BookmarksPage })),
);
const BudgetsPage = lazy(() =>
  import('@/pages/student/BudgetsPage').then((page) => ({ default: page.BudgetsPage })),
);
const CategoriesPage = lazy(() =>
  import('@/pages/student/CategoriesPage').then((page) => ({ default: page.CategoriesPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/student/DashboardPage').then((page) => ({ default: page.DashboardPage })),
);
const ImportPage = lazy(() =>
  import('@/pages/student/ImportPage').then((page) => ({ default: page.ImportPage })),
);
const InsightsPage = lazy(() =>
  import('@/pages/student/InsightsPage').then((page) => ({ default: page.InsightsPage })),
);
const MonthlyReportPage = lazy(() =>
  import('@/pages/student/MonthlyReportPage').then((page) => ({ default: page.MonthlyReportPage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/student/NotificationsPage').then((page) => ({ default: page.NotificationsPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/student/ProfilePage').then((page) => ({ default: page.ProfilePage })),
);
const ReportsPage = lazy(() =>
  import('@/pages/student/ReportsPage').then((page) => ({ default: page.ReportsPage })),
);
const SavingTipsPage = lazy(() =>
  import('@/pages/student/SavingTipsPage').then((page) => ({ default: page.SavingTipsPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/student/SettingsPage').then((page) => ({ default: page.SettingsPage })),
);
const TransactionDetailPage = lazy(() =>
  import('@/pages/student/TransactionDetailPage').then((page) => ({
    default: page.TransactionDetailPage,
  })),
);
const TransactionEditPage = lazy(() =>
  import('@/pages/student/TransactionEditPage').then((page) => ({
    default: page.TransactionEditPage,
  })),
);
const TransactionNewPage = lazy(() =>
  import('@/pages/student/TransactionNewPage').then((page) => ({
    default: page.TransactionNewPage,
  })),
);
const TransactionsListPage = lazy(() =>
  import('@/pages/student/TransactionsListPage').then((page) => ({
    default: page.TransactionsListPage,
  })),
);

const AdminAnnouncementsPage = lazy(() =>
  import('@/pages/admin/AdminAnnouncementsPage').then((page) => ({
    default: page.AdminAnnouncementsPage,
  })),
);
const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/AdminCategoriesPage').then((page) => ({
    default: page.AdminCategoriesPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((page) => ({ default: page.AdminDashboardPage })),
);
const AdminStatisticsPage = lazy(() =>
  import('@/pages/admin/AdminStatisticsPage').then((page) => ({
    default: page.AdminStatisticsPage,
  })),
);
const AdminUserDetailPage = lazy(() =>
  import('@/pages/admin/AdminUserDetailPage').then((page) => ({
    default: page.AdminUserDetailPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((page) => ({ default: page.AdminUsersPage })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public marketing + informational pages */}
        <Route element={<PublicLayout />}>
          <Route path={PUBLIC_ROUTES.home} element={<HomePage />} />
          <Route path={PUBLIC_ROUTES.about} element={<AboutPage />} />
          <Route path={PUBLIC_ROUTES.features} element={<FeaturesPage />} />
          <Route path={PUBLIC_ROUTES.faq} element={<FaqPage />} />
        </Route>

        {/* Auth flows */}
        <Route element={<AuthLayout />}>
          <Route path={PUBLIC_ROUTES.login} element={<LoginPage />} />
          <Route path={PUBLIC_ROUTES.adminLogin} element={<AdminLoginPage />} />
          <Route path={PUBLIC_ROUTES.register} element={<RegisterPage />} />
          <Route path={PUBLIC_ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={PUBLIC_ROUTES.resetPassword} element={<ResetPasswordPage />} />
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
            <Route path={STUDENT_ROUTES.bookmarks} element={<BookmarksPage />} />
            <Route path={STUDENT_ROUTES.import} element={<ImportPage />} />
            <Route path={STUDENT_ROUTES.profile} element={<ProfilePage />} />
            <Route path={STUDENT_ROUTES.settings} element={<SettingsPage />} />
            <Route path={STUDENT_ROUTES.notifications} element={<NotificationsPage />} />
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
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
