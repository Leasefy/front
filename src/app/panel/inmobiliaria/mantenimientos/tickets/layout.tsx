'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { getApiConfig } from '@/lib/api/config';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { useI18n } from '@/lib/i18n';

/**
 * 🔴 Pantalla fantasma (revisión de Operación, 21-10: 0,5 con 3 bloqueantes). El micro
 * todavía no sirve la bandeja del agente de mantenimiento (`/mantenimiento/inbox`): sin el
 * simulado, las rutas `tickets/*` eran una pantalla vacía o en error, en inglés (score,
 * triage, SLA). Nico, 03-09: «¿qué es eso de tickets? no veo que funcione». Mientras el micro
 * no la sirva, quien llegue por un enlace viejo va a Mantenimientos; con el simulado pedido
 * a mano (`NEXT_PUBLIC_USE_MOCK_API=true`, nunca en producción) se sigue viendo para
 * desarrollarla.
 */
export default function MantenimientoLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading } = usePermissionsContext();
  const { t } = useI18n();
  const router = useRouter();
  const sinElMicro = !getApiConfig().useMockApi;
  useEffect(() => {
    if (sinElMicro) router.replace('/panel/inmobiliaria/mantenimientos');
  }, [sinElMicro, router]);

  if (sinElMicro) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

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
        <p className="text-lg font-medium text-neutral-900">
          {t('inmobiliaria.ai.access.noAccessMantenimiento')}
        </p>
        <p className="text-sm text-neutral-500 max-w-sm">
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
