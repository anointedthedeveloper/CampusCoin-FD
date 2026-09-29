import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROUTES, PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { ApiError } from '@/types/api';
import type { User } from '@/types/user';

/** Where a user should land after signing in. */
export function postLoginPath(user: User, redirectFrom?: string): string {
  if (user.hasPassword === false) return PUBLIC_ROUTES.setPassword;
  if (user.role === 'admin') return redirectFrom ?? ADMIN_ROUTES.dashboard;
  const status = user.onboarding?.status ?? 'not_started';
  const needsOnboarding = status === 'not_started' || status === 'in_progress';
  return redirectFrom ?? (needsOnboarding ? STUDENT_ROUTES.onboarding : STUDENT_ROUTES.dashboard);
}

/**
 * Shared "Continue with Google" behaviour for the login and sign-up pages:
 * - an existing Google user goes straight to their dashboard (or onboarding),
 * - a brand-new Google user is asked to choose a password,
 * - an existing email/password account with the same email is detected and
 *   the student is asked whether to link the two.
 */
export function useGoogleSignIn(redirectFrom?: string) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ idToken: string; message: string } | null>(null);

  async function signIn(idToken: string, linkAccount = false) {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginWithGoogle(idToken, linkAccount);
      navigate(postLoginPath(user, redirectFrom), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ACCOUNT_LINK_REQUIRED') {
        setPendingLink({ idToken, message: err.message });
        return;
      }
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const linkDialog = pendingLink ? (
    <ConfirmDialog
      open
      tone="primary"
      title="Link your Google account?"
      description={
        <>
          {pendingLink.message}
          <span className="mt-2 block text-xs">Your existing password keeps working, and your data stays the same.</span>
        </>
      }
      confirmLabel="Link and continue"
      onConfirm={() => signIn(pendingLink.idToken, true)}
      onClose={() => setPendingLink(null)}
    />
  ) : null;

  return { signIn, isLoading, error, setError, linkDialog };
}
