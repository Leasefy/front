'use client';

import { I18nProvider } from '@/lib/i18n';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { SegundoFactorPendienteGuard } from '@/components/auth/SegundoFactorPendienteGuard';

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
          No montes otro acá: sonner pinta cada toast en TODOS los Toaster montados. */}
      <I18nProvider>
        {/* Con el código del segundo factor pendiente, primero el código
            (QA 01-10-2026: el selector de perfil y los onboardings no tenían
            guardia). */}
        <SegundoFactorPendienteGuard>{children}</SegundoFactorPendienteGuard>
      </I18nProvider>
    </ForceLightMode>
  );
}
