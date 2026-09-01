'use client';

/**
 * Paso 5 de la migración: los registros contables.
 *
 * Mismo guard que el paso 4: `module="configuracion"`, por `view`. Escribir
 * lo decide el back (ADMIN o CONTADOR).
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { RegistrosContables } from '@/components/migracion/RegistrosContables';
import { useI18n } from '@/lib/i18n';

export default function RegistrosContablesPage() {
  return (
    <PageGuard module="configuracion">
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
          href="/panel/inmobiliaria/migracion"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('migracion.nav')}
        </Link>
        <Eyebrow>{t('migracion.eyebrow')}</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {t('migracion.contables.titulo')}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">{t('migracion.contables.subtitulo')}</p>
      </header>

      <RegistrosContables />
    </div>
  );
}
