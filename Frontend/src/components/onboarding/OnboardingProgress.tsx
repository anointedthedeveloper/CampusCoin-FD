import { cn } from '@/utils/cn';

export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Step {step} of {total}
      </p>
      <div className="flex items-center gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }, (_, i) => i + 1).map((dot) => (
          <span
            key={dot}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              dot === step
                ? 'w-8 bg-brand-500 dark:bg-primary-accent'
                : dot < step
                  ? 'w-1.5 bg-brand-500/50 dark:bg-primary-accent/50'
                  : 'w-1.5 bg-gray-200 dark:bg-white/15',
            )}
          />
        ))}
      </div>
    </div>
  );
}
