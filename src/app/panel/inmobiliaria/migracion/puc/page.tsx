'use client';

/**
 * Paso 4 de la migración: el plan de cuentas.
 *
 * Guard por `module="configuracion"` —el mismo `@RequirePermission` del back
 * para la migración— y por `view`, nunca por `create`: `canAccess()` en false
 * es también lo que devuelve el servicio de permisos mientras no contesta, y
 * el guard REDIRIGE. Escribir lo decide el back (ADMIN o CONTADOR).
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { PlanDeCuentas } from '@/components/migracion/PlanDeCuentas';
import { useI18n } from '@/lib/i18n';

export default function PlanDeCuentasPage() {
  return (
    <PageGuard module="configuracion">
      <ContenidoDelPuc />
    </PageGuard>
  );
}

function ContenidoDelPuc() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <Link
          href="/panel/inmobiliaria/contabilidad"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('inmobiliaria.nav.contabilidad')}
        </Link>
        <Eyebrow>{t('migracion.eyebrow')}</Eyebrow>
        <h1 className="text-h2 text-fg">{t('migracion.puc.titulo')}</h1>
        <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">{t('migracion.puc.subtitulo')}</p>
      </header>

      <PlanDeCuentas />
    </div>
  );
}
