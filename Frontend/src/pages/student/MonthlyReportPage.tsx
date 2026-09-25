import { Navigate } from 'react-router-dom';
import { STUDENT_ROUTES } from '@/constants/routes';

// The Reports page already covers the monthly view via its period tabs.
export function MonthlyReportPage() {
  return <Navigate to={STUDENT_ROUTES.reports} replace />;
}
