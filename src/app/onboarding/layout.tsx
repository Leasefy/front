'use client';

import { I18nProvider } from '@/lib/i18n';
import { ForceLightMode } from '@/components/providers/ForceLightMode';

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
      {/* El <Toaster> es único y vive en el layout raíz (src/app/layout.tsx).
          No montés otro acá: sonner pinta cada toast en TODOS los Toaster montados. */}
      <I18nProvider>{children}</I18nProvider>
    </ForceLightMode>
  );
}
