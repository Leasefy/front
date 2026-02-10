import { BetaLayout } from '@/components/beta/BetaLayout';

/**
 * Beta layout for propietarios (/panel/beta/*).
 * Renders the Mission Control layout as a full-screen overlay.
 */
export default function BetaRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <BetaLayout basePath="/panel">
      {children}
    </BetaLayout>
  );
}
