'use client';

import React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { usePathname } from 'next/navigation';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista';
import { RETENCION, RETENCION_APROBAR, RETENCION_RIESGO } from '@/lib/nav/rutas-de-retencion';

export default function RetencionLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading } = usePermissionsContext();
  const pathname = usePathname() ?? '';
  // C-19: en la bandeja y en la cola, la salida al tablero del agente (además de
  // las migas y las pestañas). La ficha de un caso trae la suya, a la bandeja.
  const conVolver = pathname === RETENCION_RIESGO || pathname === RETENCION_APROBAR;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        {/* Dentro del panel va el spinner, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <Spinner size="md" variant="muted" label="Cargando" />
      </div>
    );
  }

  if (!canAccess('retencion', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-fg">
          No tienes acceso a Retención
        </p>
        <p className="text-sm text-fg-muted max-w-sm">
          Contacta al administrador de tu inmobiliaria para solicitar acceso.
        </p>
      </div>
    );
  }

  // Sin breadcrumb inline: el header del panel ya dice dónde estás (Agentes IA ›
  // Retención › Riesgo de salida | Por aprobar, QA-CONT C-19) y las pestañas
  // del agente (`AGENT_WORKSPACES`, slug `retencion`) son el camino entre las
  // tres. Este layout es el ÚNICO gate del tablero (page.tsx no trae PageGuard
  // propio), por eso se queda.
  return (
    <>
      {conVolver ? (
        <div className="px-6 pt-6 lg:px-8 lg:pt-8">
          <VolverALaLista href={RETENCION} label="Volver al tablero de Retención" />
        </div>
      ) : null}
      {children}
    </>
  );
}
