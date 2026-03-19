import type { Metadata } from 'next';
import { BetaLayout } from '@/components/beta/BetaLayout';
import { BetaErrorBoundary } from '@/components/beta/BetaErrorBoundary';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'AI Beta - Leasefy',
  description: 'Centro de control de Leasefy AI para administracion de arriendos',
};

/**
 * Beta layout for propietarios (/panel/beta/*).
 *
 * Renders the Mission Control layout as a full-screen overlay,
 * replacing the standard dashboard view. The AppSwitcher in the
 * sidebar allows returning to the classic dashboard.
 *
 * ProtectedRoute ensures only authenticated landlords can access.
 * I18nProvider required because this route is outside the (landlord) group.
 * Outer error boundary catches page-level errors that escape
 * the inner boundaries in BetaLayout.
 */
export default function BetaRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['landlord']}>
      <I18nProvider>
        <BetaErrorBoundary>
          <BetaLayout basePath="/panel">
            {children}
          </BetaLayout>
        </BetaErrorBoundary>
      </I18nProvider>
    </ProtectedRoute>
  );
}
