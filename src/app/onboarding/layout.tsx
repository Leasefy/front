'use client';

import { I18nProvider } from '@/lib/i18n';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { Toaster } from '@/components/ui/toast';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

/**
 * Onboarding Layout - Provides i18n context for all onboarding flows
 * Forces light mode for all onboarding pages (public/pre-login flows)
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <ForceLightMode>
      <I18nProvider>
        {children}
        <Toaster position="top-center" />
      </I18nProvider>
    </ForceLightMode>
  );
}
