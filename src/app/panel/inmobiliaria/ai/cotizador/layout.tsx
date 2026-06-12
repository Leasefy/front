'use client';

import React from 'react';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useI18n } from '@/lib/i18n';

export default function CotizadorLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading } = usePermissionsContext();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess('cotizador', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-neutral-900 dark:text-white">
          {t('inmobiliaria.ai.access.noAccessCotizador')}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          {t('inmobiliaria.ai.access.contactAdmin')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 pt-4 lg:px-8">
        <Breadcrumb
          items={[
            { label: t('inmobiliaria.ai.breadcrumb.aiAgents'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.breadcrumb.cotizador') },
          ]}
          showHouseIcon
          homeHref="/panel/inmobiliaria"
        />
      </div>
      {children}
    </div>
  );
}
