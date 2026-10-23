'use client';

/**
 * Pasos 1 y 2 de la migración: propietarios e inquilinos (acá, con el switch).
 *
 * Se entra desde `/panel/inmobiliaria/migracion`, que es donde vive la
 * secuencia: una ruta que nada enlaza no es una pantalla.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { MigrarTerceros } from '@/components/migracion/MigrarTerceros';
import { useI18n } from '@/lib/i18n';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { BackButton } from '@/components/ui/back-button';

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
   *
   * 🔴 Y sí, esto NO coincide con sus hermanas `/migracion/{puc,contables}`, que
   * gatean por `roles={[ADMIN, CONTADOR]}`. No es una inconsistencia a limpiar:
   * ahí el back usa `ContabilidadEscrituraGuard`; acá usa de verdad
   * `@RequirePermission('configuracion', …)`, y el CONTADOR no tiene ese módulo.
   * Abrirle esta pantalla lo mandaría a un 403 después de subir el archivo.
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
      {/* La página «Migración» ya no existe (el muro es la migración): se vuelve a la sección de la que se entra. */}
      <div className="space-y-3">
        <BackButton
          href={tipoInicial === 'INQUILINO' ? '/panel/inmobiliaria/inquilinos' : '/panel/inmobiliaria/propietarios'}
          label={tipoInicial === 'INQUILINO' ? t('inquilinos.titulo') : t('inmobiliaria.nav.propietarios')}
        />
        <EncabezadoDePantalla
          seccion={t('migracion.eyebrow')}
          titulo={t('migracion.terceros.titulo')}
          descripcion={t('migracion.terceros.subtitulo')}
        />
      </div>

      {/* `key`: si cambia el `?tipo=` de la URL, la pantalla arranca limpia (misma razón que en el muro). */}
      <MigrarTerceros key={tipoInicial} tipoInicial={tipoInicial} />
    </div>
  );
}
