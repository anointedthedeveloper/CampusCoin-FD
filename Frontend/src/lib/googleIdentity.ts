// Render Google's own interactive button and forward its ID token to the app.
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
  renderButton(parent: HTMLElement, options: {
    type: 'standard';
    theme: 'outline';
    size: 'large';
    text: 'signin_with' | 'signup_with' | 'continue_with';
    shape: 'rectangular';
    width: number;
  }): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_ID = 'google-identity-script';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;
let clientIdPromise: Promise<string | null> | null = null;
let activeCredentialHandler: ((token: string) => void) | null = null;

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
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      const script = existing ?? document.createElement('script');
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Failed to load Google sign-in.')), { once: true });
      if (!existing) {
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    });
  }
  return scriptPromise;
}

function ensureInitialized(clientId: string): Promise<void> {
  if (!initPromise) {
    initPromise = loadScript().then(() => {
      const googleId = window.google?.accounts?.id;
      if (!googleId) throw new Error('Google sign-in could not be initialized.');
      googleId.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: (response) => {
          if (response.credential) activeCredentialHandler?.(response.credential);
        },
      });
    });
  }
  return initPromise;
}

/** Mounts Google's interactive button and forwards the verified ID-token payload. */
export function mountGoogleButton(
  container: HTMLElement,
  text: 'signin_with' | 'signup_with' | 'continue_with',
  onCredential: (token: string) => void,
  onError: (message: string) => void,
): () => void {
  let cancelled = false;
  const forwardCredential = (token: string) => onCredential(token);

  void (async () => {
    const clientId = await getClientId();
    if (!clientId) throw new Error('Google sign-in is not configured on this server.');
    await ensureInitialized(clientId);
    if (cancelled) return;

    activeCredentialHandler = forwardCredential;
    const width = Math.max(200, Math.min(400, Math.floor(container.getBoundingClientRect().width || 400)));
    window.google!.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      shape: 'rectangular',
      width,
    });
  })().catch((error: unknown) => {
    if (!cancelled) onError(error instanceof Error ? error.message : 'Failed to load Google sign-in.');
  });

  return () => {
    cancelled = true;
    if (activeCredentialHandler === forwardCredential) activeCredentialHandler = null;
    container.replaceChildren();
  };
}
