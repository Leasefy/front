'use client';

import React from 'react';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { useI18n } from '@/lib/i18n';
import { Spinner } from '@/components/ui';

export default function CotizadorLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading } = usePermissionsContext();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

  if (!canAccess('cotizador', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-base font-semibold text-fg">
          {t('inmobiliaria.ai.access.noAccessCotizador')}
        </p>
        <p className="text-sm text-fg-muted max-w-sm">
          {t('inmobiliaria.ai.access.contactAdmin')}
        </p>
      </div>
    );
  }

  // Navigation (breadcrumb + tabs) now lives at the top: the breadcrumb in the
  // PlanHeader (AgentHeaderBreadcrumb) and the function tabs in WorkspaceNav.
  return <>{children}</>;
}
