'use client';

import React from 'react';
import { Spinner } from '@/components/ui';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { useI18n } from '@/lib/i18n';

export default function MantenimientoLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading } = usePermissionsContext();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        {/* El <Spinner> del repo, no un div con `border-violet-600` a mano:
            el violeta crudo no tiene par en oscuro y se sale del sistema. */}
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

  if (!canAccess('mantenimiento', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-neutral-900 dark:text-white">
          {t('inmobiliaria.ai.access.noAccessMantenimiento')}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          {t('inmobiliaria.ai.access.contactAdmin')}
        </p>
      </div>
    );
  }

  // Sin breadcrumb inline: el header del panel ya dice «Mantenimientos › Tickets»
  // y las secciones del módulo (cards) + las pestañas del agente (WorkspaceNav) viven debajo. Este layout es el
  // ÚNICO gate de la bandeja, el resumen y la ficha del ticket: se queda.
  return <>{children}</>;
}
