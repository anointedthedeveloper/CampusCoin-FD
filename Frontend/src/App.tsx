import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ScrollToTop } from '@/components/common';
import { AppRoutes } from '@/routes';
import { useTawkTo } from '@/hooks/useTawkTo';

function App() {
  useEffect(() => {
    document.getElementById('initial-page-loader')?.remove();
  }, []);

  // Global live-chat widget — loaded once here so it's available on every
  // route (marketing pages and the authenticated app alike) without wiring
  // it into each page individually.
  useTawkTo();

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
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
