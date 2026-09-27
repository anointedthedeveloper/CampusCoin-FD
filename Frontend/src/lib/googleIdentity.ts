// Thin wrapper around Google Identity Services' ID-token flow. We render
// Google's own button off-screen (a synthetic click on it reliably opens the
// real account-chooser popup, unlike google.accounts.id.prompt()'s One Tap,
// which browsers can silently suppress) and forward the credential it
// produces to whichever custom-styled button the caller clicked.
//
// The client ID itself is fetched from the backend (GET /auth/google/config)
// rather than read from a VITE_ build-time env var, so it only has to be
// configured in one place (the backend's GOOGLE_CLIENT_ID). It's not a
// secret — every Google sign-in button on the web embeds its client ID in
// public page source — so serving it over a plain unauthenticated GET is
// safe.
import { httpClient } from '@/api/httpClient';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void; ux_mode?: string }): void;
  renderButton(parent: HTMLElement, options: { type: string }): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_ID = 'google-identity-script';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let hiddenButtonEl: HTMLElement | null = null;
let initPromise: Promise<void> | null = null;
let pending: { resolve: (token: string) => void; reject: (err: Error) => void } | null = null;
let clientIdPromise: Promise<string | null> | null = null;

/** Fetches (and caches) the Google client ID from the backend. */
function getClientId(): Promise<string | null> {
  if (!clientIdPromise) {
    clientIdPromise = httpClient
      .get<{ data: { clientId: string | null } }>('/auth/google/config')
      .then((res) => res.data.data.clientId)
      .catch(() => null);
  }
  return clientIdPromise;
}

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in.'));
    document.head.appendChild(script);
  });
}

function ensureInitialized(clientId: string): Promise<void> {
  if (!initPromise) {
    initPromise = loadScript().then(() => {
      window.google!.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: (response) => {
          pending?.resolve(response.credential);
          pending = null;
        },
      });
      hiddenButtonEl = document.createElement('div');
      hiddenButtonEl.style.position = 'fixed';
      hiddenButtonEl.style.top = '-9999px';
      hiddenButtonEl.style.left = '-9999px';
      document.body.appendChild(hiddenButtonEl);
      window.google!.accounts.id.renderButton(hiddenButtonEl, { type: 'standard' });
    });
  }
  return initPromise;
}

/** Warms up the Google Identity script ahead of time so the first real click isn't delayed. */
export function preloadGoogleIdentity(): void {
  void getClientId().then((clientId) => {
    if (!clientId) return;
    return ensureInitialized(clientId).catch(() => {
      // Ignore — requestGoogleIdToken() will surface the failure on actual use.
    });
  });
}

/** Opens the Google account chooser and resolves with an ID token to send to the backend. */
export async function requestGoogleIdToken(): Promise<string> {
  const clientId = await getClientId();
  if (!clientId) {
    throw new Error('Google sign-in is not set up for this app yet.');
  }

  if (!hiddenButtonEl) {
    await ensureInitialized(clientId);
  }

  return new Promise((resolve, reject) => {
    // The button-triggered flow has no "popup closed without choosing an
    // account" callback, so without a timeout a cancelled sign-in would
    // leave the caller's loading state stuck forever.
    const timeout = window.setTimeout(() => {
      pending = null;
      reject(new Error('Google sign-in was closed or timed out. Please try again.'));
    }, 60_000);

    pending = {
      resolve: (token) => {
        window.clearTimeout(timeout);
        resolve(token);
      },
      reject: (err) => {
        window.clearTimeout(timeout);
        reject(err);
      },
    };

    const clickable = hiddenButtonEl?.querySelector<HTMLElement>('div[role="button"]');
    if (!clickable) {
      window.clearTimeout(timeout);
      pending = null;
      reject(new Error('Google sign-in button failed to render.'));
      return;
    }
    clickable.click();
  });
}
