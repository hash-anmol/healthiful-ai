import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  headerTitle: string;
  question: string;
  subtitle: string;
  onBack?: () => void;
  onContinue?: () => void;
  showFooter?: boolean;
  showHeader?: boolean;
  showProgress?: boolean;
  disableContinue?: boolean;
  children: React.ReactNode;
}

export const OnboardingShell: React.FC<OnboardingShellProps> = ({
  step,
  totalSteps,
  headerTitle,
  question,
  subtitle,
  onBack,
  onContinue,
  showFooter = true,
  showHeader = true,
  showProgress = true,
  disableContinue = false,
  children,
}) => {
  const progressPercent = Math.round(((step) / (totalSteps - 1)) * 100);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden font-sans">
      {showHeader && (
        <header className="px-6 pt-6 pb-4 flex flex-col gap-6 relative z-20">
          <div className="flex items-center justify-between relative">
            <button
              onClick={onBack}
              disabled={!onBack}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200 disabled:opacity-40"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--foreground)]" />
            </button>
            <h1 className="text-base font-semibold tracking-wide uppercase text-[var(--muted-foreground)]">
              {headerTitle}
            </h1>
            <div className="w-10" />
          </div>
          {showProgress && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                <span>Progress</span>
                <span>{step} / {totalSteps - 1}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--primary)] rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          )}
        </header>
      )}

      <main className="flex-1 px-6 flex flex-col relative z-10 overflow-y-auto pb-28">
        <div className="text-center mt-2 mb-6">
          <h2 className="text-2xl font-bold leading-tight">
            {question}
          </h2>
          <p className="text-[var(--muted-foreground)] text-sm">{subtitle}</p>
        </div>
        {children}
      </main>

      {showFooter && (
        <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent z-50">
          <Button
            onClick={onContinue}
            size="lg"
            disabled={disableContinue}
            className="w-full text-lg font-bold rounded-2xl bg-[var(--primary)] text-white shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all duration-200"
          >
            Continue
          </Button>
        </footer>
      )}
    </div>
  );
};
