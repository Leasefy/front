'use client';

/**
 * Paso 5 de la migración: los registros contables.
 *
 * Mismo guard que el paso 4, y por la misma razón: el back protege
 * `/inmobiliaria/contabilidad/{asientos,migracion}` con
 * `ContabilidadEscrituraGuard` —`[ADMIN, CONTADOR]`—, no con
 * `@RequirePermission('configuracion', …)`. Con `module="configuracion"` el
 * front expulsaba al CONTADOR de una pantalla que el back sí le abre.
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { RegistrosContables } from '@/components/migracion/RegistrosContables';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { useI18n } from '@/lib/i18n';

export default function RegistrosContablesPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ContenidoDeContables />
    </PageGuard>
  );
}

function ContenidoDeContables() {
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
        <h1 className="text-h2 text-fg">
          {t('migracion.contables.titulo')}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">{t('migracion.contables.subtitulo')}</p>
      </header>

      <RegistrosContables />
    </div>
  );
}
