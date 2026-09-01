'use client';

/**
 * Pasos 1 y 2 de la migración: propietarios e inquilinos (acá, con el switch).
 *
 * Se entra desde `/panel/inmobiliaria/migracion`, que es donde vive la
 * secuencia: una ruta que nada enlaza no es una pantalla.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import { Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { MigrarTerceros } from '@/components/migracion/MigrarTerceros';
import { useI18n } from '@/lib/i18n';

export default function MigrarTercerosPage() {
  /*
   * `configuracion`, el mismo módulo con el que el back protege esta
   * superficie (`@RequirePermission('configuracion', …)`): crea fichas de
   * propietarios con sus datos bancarios Y cuentas del portal para inquilinos,
   * en bloque. `propietarios` la dejaría abierta a un AGENTE y no cubriría el
   * lado de los inquilinos.
   *
   * Guard por `view`, no por `create`: `canAccess()` en false también es lo que
   * devuelve mientras el servicio de permisos no contesta, y el guard REDIRIGE.
   * Quién puede aplicar de verdad lo decide el back.
   */
  return (
    <PageGuard module="configuracion">
      <ContenidoDeTerceros />
    </PageGuard>
  );
}

function ContenidoDeTerceros() {
  const { t } = useI18n();
  // La secuencia enlaza `?tipo=inquilinos`: la pantalla suelta arranca en ese tipo.
  const tipoInicial = useSearchParams()?.get('tipo') === 'inquilinos' ? 'INQUILINO' : 'PROPIETARIO';

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
          {t('migracion.terceros.titulo')}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">{t('migracion.terceros.subtitulo')}</p>
      </header>

      <MigrarTerceros tipoInicial={tipoInicial} />
    </div>
  );
}
