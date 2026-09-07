'use client';

import React from 'react';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';

export default function RetencionLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading } = usePermissionsContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

  // Sin breadcrumb inline: el header del panel ya dice dónde estás (Contratos ›
  // Retención | Riesgo | Por aprobar) y las cards de secciones del módulo son el
  // camino entre las tres. Este layout es el ÚNICO gate de la Sala (page.tsx no
  // trae PageGuard propio), por eso se queda.
  return <>{children}</>;
}
