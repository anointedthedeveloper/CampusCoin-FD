// Access to ThemeContext (current theme and toggle).

import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';

/** Must be used inside <ThemeProvider>. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
