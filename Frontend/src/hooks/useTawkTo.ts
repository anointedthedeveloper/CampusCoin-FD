import { useEffect } from 'react';
import { TAWKTO_EMBED_SRC } from '@/constants/config';

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
  }
}

const TAWK_SCRIPT_ID = 'tawkto-embed-script';

/**
 * Loads the Tawk.to live-chat embed once, globally, for the app's lifetime.
 * Tawk.to injects and controls its own floating launcher/iframe — this hook
 * only gets the loader script onto the page, so widget appearance (color,
 * greeting, position offsets) is configured entirely from the Tawk.to
 * dashboard, not here.
 *
 * Guards on an element id rather than just an effect-scoped flag because
 * StrictMode double-invokes effects in dev, and the guard needs to survive
 * that as a script tag already present in the DOM, not component state.
 */
export function useTawkTo() {
  useEffect(() => {
    if (document.getElementById(TAWK_SCRIPT_ID)) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.id = TAWK_SCRIPT_ID;
    script.async = true;
    script.src = TAWKTO_EMBED_SRC;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }, []);
}
