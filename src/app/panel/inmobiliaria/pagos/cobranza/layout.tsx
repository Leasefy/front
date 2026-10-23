'use client';

/**
 * Puerta de acceso a Cobranza. Los tres estados y el porqué viven en
 * `AgentModuleGate`.
 *
 * Revisora r25 (ronda 26):
 *   · C1 — la puerta dice el título de la RUTA (el mismo mapa de las migas) y,
 *     en una sub-pantalla, su vuelta; el sobretítulo es «Cobranza», el mismo de
 *     las pantallas (antes «Agentes IA» en la puerta y «Cobranza» adentro).
 *   · C4 — las sub-pantallas sin pestaña (analítica, reporte, cumplimiento ›
 *     bitácora…) llevan su vuelta arriba en TODOS sus estados: la pinta acá.
 *   · C2 — las hermanas de una pestaña agrupada (Llamadas · Cartas ·
 *     Recordatorios) se eligen con `SegmentosDelAgente`.
 */

import React from 'react';
import { usePathname } from 'next/navigation';
import { AgentModuleGate } from '@/components/auth/AgentModuleGate';
import { BackButton } from '@/components/ui/back-button';
import { SegmentosDelAgente } from '@/components/inmobiliaria/ai/SegmentosDelAgente';
import { useI18n } from '@/lib/i18n';
import { claveDelTituloDeLaRuta, vueltaDeLaRuta } from '@/lib/nav/lugar-en-cobranza';

export default function CobranzaLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname() ?? '';
  const vuelta = vueltaDeLaRuta(pathname);

  // Navigation (breadcrumb + tabs) lives at the top: the breadcrumb in the
  // PlanHeader (AgentHeaderBreadcrumb) and the function tabs in WorkspaceNav.
  return (
    <AgentModuleGate
      module="cobranza"
      deniedTitle={t('inmobiliaria.ai.access.noAccessCobranza')}
      seccion="Cobranza"
      titulo={t(claveDelTituloDeLaRuta(pathname))}
      vuelta={vuelta ?? undefined}
      salida={{ label: 'Ver la deuda del mes', href: '/panel/inmobiliaria/pagos' }}
    >
      <SegmentosDelAgente className="px-6 pt-6 lg:px-8 lg:pt-8" />
      {vuelta ? (
        <div className="px-6 pt-6 lg:px-8 lg:pt-8" data-testid="vuelta-de-la-subpantalla">
          <BackButton href={vuelta.href} label={vuelta.label} variant="subtle" />
        </div>
      ) : null}
      {children}
    </AgentModuleGate>
  );
}
