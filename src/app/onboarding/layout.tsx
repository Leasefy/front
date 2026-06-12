'use client';

import { I18nProvider } from '@/lib/i18n';
import { Toaster } from 'sonner';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

/**
 * Onboarding Layout - Provides i18n context for all onboarding flows
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <I18nProvider>
      {children}
      <Toaster position="top-center" richColors />
    </I18nProvider>
  );
}
