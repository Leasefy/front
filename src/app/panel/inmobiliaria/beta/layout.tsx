import { BetaLayout } from '@/components/beta/BetaLayout';

/**
 * Beta layout for inmobiliarias (/panel/inmobiliaria/beta/*).
 * Renders the Mission Control layout as a full-screen overlay.
 */
export default function InmobiliariaBetaRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <BetaLayout basePath="/panel/inmobiliaria">
      {children}
    </BetaLayout>
  );
}
