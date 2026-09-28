import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ScrollToTop, TawkToVisibility } from '@/components/common';
import { AppRoutes } from '@/routes';
import { useTawkTo, useTawkToClickOutside } from '@/hooks/useTawkTo';

function App() {
  useEffect(() => {
    document.getElementById('initial-page-loader')?.remove();
  }, []);

  // Global live-chat widget — loaded once here so it's available on every
  // route (marketing pages and the authenticated app alike) without wiring
  // it into each page individually. Route-based show/hide (TawkToVisibility)
  // needs the router, so it's mounted inside BrowserRouter below instead.
  useTawkTo();
  useTawkToClickOutside();

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <TawkToVisibility />
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
