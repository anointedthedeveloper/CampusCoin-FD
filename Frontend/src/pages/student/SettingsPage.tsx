import { Navigate } from 'react-router-dom';
import { STUDENT_ROUTES } from '@/constants/routes';

// Account settings live on the combined Profile & Settings page.
export function SettingsPage() {
  return <Navigate to={STUDENT_ROUTES.profile} replace />;
}
