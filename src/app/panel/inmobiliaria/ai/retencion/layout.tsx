'use client';

import React from 'react';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function RetencionLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading } = usePermissionsContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess('retencion', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-neutral-900 dark:text-white">
          No tienes acceso a Retención
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          Contacta al administrador de tu inmobiliaria para solicitar acceso.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 pt-4 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Agentes AI', href: '/panel/inmobiliaria/ai' },
            { label: 'Retención' },
          ]}
          showHouseIcon
          homeHref="/panel/inmobiliaria"
        />
      </div>
      {children}
    </div>
  );
}
