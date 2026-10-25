'use client';

/**
 * Puerta de acceso a Asegurabilidad (cotizador). Tenía el mismo defecto que
 * Cobranza; los tres estados y el porqué viven en `AgentModuleGate`.
 *
 * Revisora r25: con el micro caído la puerta era un cartel sin título, sin
 * sección y sin salida («Reintentar» y nada más). Ahora lleva su título, la
 * sección del menú y el camino a las postulaciones, como Cobranza.
 */

import React from 'react';
import { redirect, usePathname } from 'next/navigation';
import { AgentModuleGate } from '@/components/auth/AgentModuleGate';
import { useI18n } from '@/lib/i18n';
import { esRutaRetirada } from '@/lib/cotizador/rutas-retiradas';

const BASE = '/panel/inmobiliaria/postulaciones/asegurabilidad';

export default function CotizadorLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  if (esRutaRetirada(pathname)) redirect(BASE);

  // Navigation (breadcrumb + tabs) now lives at the top: the breadcrumb in the
  // PlanHeader (AgentHeaderBreadcrumb) and the function tabs in WorkspaceNav.
  return (
    <AgentModuleGate
      module="cotizador"
      deniedTitle={t('inmobiliaria.ai.access.noAccessCotizador')}
      seccion="Agentes IA"
      titulo="Asegurabilidad"
      salida={{ label: 'Ver las postulaciones', href: '/panel/inmobiliaria/postulaciones' }}
    >
      {children}
    </AgentModuleGate>
  );
}
