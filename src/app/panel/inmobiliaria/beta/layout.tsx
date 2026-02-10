import type { Metadata } from 'next';
import { BetaLayout } from '@/components/beta/BetaLayout';

export const metadata: Metadata = {
  title: 'AI Beta - Leasefy',
  description: 'Centro de control de Leasefy AI para inmobiliarias',
};

/**
 * Beta layout for inmobiliarias (/panel/inmobiliaria/beta/*).
 *
 * Renders the Mission Control layout as a full-screen overlay,
 * replacing the standard dashboard view. The AppSwitcher in the
 * sidebar allows returning to the classic dashboard.
 */
export default function InmobiliariaBetaRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <BetaLayout basePath="/panel/inmobiliaria">
      {children}
    </BetaLayout>
  );
}
