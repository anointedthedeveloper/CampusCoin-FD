import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TAWKTO_EMBED_SRC } from '@/constants/config';
import { PUBLIC_ROUTES } from '@/constants/routes';

interface TawkApi {
  hideWidget?: () => void;
  showWidget?: () => void;
  minimize?: () => void;
  onLoad?: () => void;
  onChatMaximized?: () => void;
  onChatMinimized?: () => void;
  [key: string]: unknown;
}

declare global {
  interface Window {
    Tawk_API?: TawkApi;
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

// The auth card sits close to the widget's bottom-right corner, and Tawk's
// own greeting popup (configured in the Tawk.to dashboard, not something the
// embed script can reposition) can land directly on top of the card's own
// buttons there. Simplest reliable fix: don't show the widget on these pages
// at all, rather than fighting a popup we can't reposition from here.
const TAWK_HIDDEN_ROUTES: string[] = [
  PUBLIC_ROUTES.login,
  PUBLIC_ROUTES.adminLogin,
  PUBLIC_ROUTES.register,
  PUBLIC_ROUTES.forgotPassword,
];

/**
 * Hides the Tawk.to widget on auth pages and shows it everywhere else.
 * Must be rendered inside the router (it reads the current route) — see
 * ScrollToTop for the same pattern.
 */
export function useTawkToVisibility() {
  const { pathname } = useLocation();

  useEffect(() => {
    const shouldHide = TAWK_HIDDEN_ROUTES.includes(pathname);

    function apply() {
      if (shouldHide) {
        window.Tawk_API?.hideWidget?.();
      } else {
        window.Tawk_API?.showWidget?.();
      }
    }

    apply();

    // hideWidget/showWidget are no-ops until the embed script has actually
    // populated Tawk_API, which can still be loading on first render — Tawk's
    // own onLoad callback is the signal to re-apply once it's ready.
    if (window.Tawk_API) {
      const previousOnLoad = window.Tawk_API.onLoad;
      window.Tawk_API.onLoad = () => {
        previousOnLoad?.();
        apply();
      };
    }
  }, [pathname]);
}

/**
 * Closes the Tawk.to chat window when the visitor clicks anywhere outside
 * it. Tawk's widget lives in a cross-origin iframe, so a click that lands
 * inside it never bubbles up to this document-level listener in the first
 * place — any click this handler sees is, by construction, already outside
 * the widget. No routing dependency, safe to mount once at the app root.
 */
export function useTawkToClickOutside() {
  useEffect(() => {
    let isOpen = false;
    let justOpened = false;

    function handleMaximized() {
      isOpen = true;
      justOpened = true;
      // The same click that opened the widget (the launcher bubble) can
      // also reach this document-level listener; ignore one tick so it
      // doesn't immediately close what it just opened.
      setTimeout(() => {
        justOpened = false;
      }, 0);
    }

    function handleMinimized() {
      isOpen = false;
    }

    function handleDocumentClick() {
      if (isOpen && !justOpened) {
        // Set isOpen ourselves rather than waiting for Tawk to call
        // onChatMinimized back in response — don't assume it round-trips
        // an event for a state change we ourselves triggered.
        isOpen = false;
        window.Tawk_API?.minimize?.();
      }
    }

    const api = (window.Tawk_API = window.Tawk_API || {});
    const previousMaximized = api.onChatMaximized;
    const previousMinimized = api.onChatMinimized;
    api.onChatMaximized = () => {
      previousMaximized?.();
      handleMaximized();
    };
    api.onChatMinimized = () => {
      previousMinimized?.();
      handleMinimized();
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      if (window.Tawk_API === api) {
        api.onChatMaximized = previousMaximized;
        api.onChatMinimized = previousMinimized;
      }
    };
  }, []);
}
