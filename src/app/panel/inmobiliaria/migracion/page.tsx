'use client';

/**
 * Migración — la puerta por la que entra una inmobiliaria completa.
 *
 * Los pasos 2 y 3 ya existían, cada uno escondido en su sección. Acá se
 * ordenan y se les pone el progreso al lado, que es lo que faltaba: nadie
 * descubre una secuencia leyendo tres menús distintos.
 */

import { Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { SecuenciaDeMigracion } from '@/components/migracion/SecuenciaDeMigracion';
import { useI18n } from '@/lib/i18n';

export default function MigracionPage() {
  /*
   * `configuracion`, que es el permiso con el que el back protege la
   * migración de terceros — el paso 1 y el corazón de esta pantalla
   * (`@RequirePermission('configuracion', …)`, que en los defaults sólo tiene
   * el ADMIN de la inmobiliaria; queda vacío para AGENTE, CONTADOR y VIEWER).
   *
   * Y por `view`, nunca por `create`: `canAccess()` en false también es lo que
   * devuelve mientras el servicio de permisos no contesta, y el guard REDIRIGE
   * — con `create` la pantalla desaparecía para todos cada vez que ese
   * servicio estuviera caído, y sin decir por qué. Quién puede migrar de
   * verdad lo decide el back, que es donde no se puede saltar.
   */
  return (
    <PageGuard module="configuracion">
      <ContenidoDeMigracion />
    </PageGuard>
  );
}

function ContenidoDeMigracion() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <Eyebrow>{t('migracion.eyebrow')}</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {t('migracion.titulo')}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">{t('migracion.subtitulo')}</p>
      </header>

      <SecuenciaDeMigracion />
    </div>
  );
}
