import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { mountGoogleButton } from '@/lib/googleIdentity';
import { cn } from '@/utils/cn';

export function GoogleButton({
  onCredential,
  isLoading,
  label = 'Continue with Google',
  className,
}: {
  onCredential: (token: string) => void;
  isLoading?: boolean;
  label?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandlerRef = useRef(onCredential);
  const [renderError, setRenderError] = useState<string | null>(null);
  const text = label.toLowerCase().includes('sign up')
    ? 'signup_with'
    : label.toLowerCase().includes('continue')
      ? 'continue_with'
      : 'signin_with';

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setRenderError(null);
    return mountGoogleButton(
      container,
      text,
      (token) => credentialHandlerRef.current(token),
      setRenderError,
    );
  }, [text]);

  return (
    <div className={cn('w-full', className)}>
      <div className="relative min-h-10 w-full" aria-busy={isLoading}>
        <div ref={containerRef} className={cn('flex min-h-10 w-full justify-center', isLoading && 'pointer-events-none opacity-50')} />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-white/80 text-sm font-medium text-gray-600 dark:bg-gray-950/80 dark:text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting…
          </div>
        )}
      </div>
      {renderError && <p role="alert" className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{renderError}</p>}
    </div>
  );
}
