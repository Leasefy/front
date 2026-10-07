'use client';

import { useRouter, usePathname } from 'next/navigation';
import { SquaresFour } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { LeasefyMark } from './LeasefyMark';

type Workspace = 'dashboard' | 'beta';

interface AppSwitcherProps {
  currentWorkspace?: Workspace;
  basePath?: string;
}

/**
 * AppSwitcher — Brand header with dashboard navigation.
 * Shows "Leasefy AI" logo and a button to switch workspaces.
 */
export function AppSwitcher({ currentWorkspace, basePath }: AppSwitcherProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const resolvedBase = basePath ?? (
    pathname.startsWith('/panel/inmobiliaria') ? '/panel/inmobiliaria' : '/panel'
  );
  // El «panel clásico» al que se salta desde el chat es Inicio (el Piloto):
  // el Dashboard viejo pasó a ser «Resumen del negocio» dentro de Reportes y ya
  // no es portada. Se detecta con borde de segmento, no con `includes`.
  const panelClasico = `${resolvedBase}/piloto`;
  const resolvedWorkspace: Workspace = currentWorkspace ?? (
    pathname === panelClasico || pathname.startsWith(`${panelClasico}/`) ? 'dashboard' : 'beta'
  );
  const isDashboard = resolvedWorkspace === 'dashboard';
  // Toggle: chat (root) ⇄ panel clásico (Inicio).
  const targetPath = isDashboard ? resolvedBase : panelClasico;

  return (
    <div className="flex items-center justify-between">
      {/* Brand — real Leasefy mark: negro en claro y blanco hueso en oscuro
          (`text-fg`), como el logo de la barra de las demás plataformas y el
          de la landing (Nico, 03-10-2026; antes, azul en claro). */}
      <div className="flex items-center gap-2.5">
        <LeasefyMark className="w-7 h-auto shrink-0 text-fg" />
        <span className="text-sm font-bold text-fg tracking-tight">
          Leasefy
          <span className="text-primary ml-1">AI</span>
        </span>
      </div>

      {/* Workspace switch */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(targetPath)}
        className="text-fg-muted hover:text-fg"
        title={isDashboard ? t('beta.appSwitcher.goToBeta') : t('beta.appSwitcher.goToDashboard')}
        aria-label={isDashboard ? t('beta.appSwitcher.goToBeta') : t('beta.appSwitcher.goToDashboard')}
      >
        <SquaresFour className="w-[18px] h-[18px]" />
      </Button>
    </div>
  );
}
