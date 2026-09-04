'use client'

/**
 * Migrar contratos — la puerta por la que entra una inmobiliaria con su
 * cartera viva.
 *
 * Se entra desde el encabezado de Contratos: una ruta que nada enlaza no es
 * una pantalla.
 */

import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import { Eyebrow } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { MigrarContratos } from '@/components/contratos/MigrarContratos'
import {
  FilasFrenadas,
  VeredictoDeMigracion,
} from '@/components/migracion/VeredictoDeMigracion'
import { useMigracionConDeuda } from '@/lib/hooks/use-migracion-con-deuda'

export default function MigrarContratosPage() {
  /*
   * Guard por "view", no por "create". `canAccess(modulo, accion)` en false NO
   * siempre significa "no tenés permiso": también es lo que devuelve mientras
   * el servicio de permisos del agente no contesta. Con `create`, esta pantalla
   * desaparecía para TODOS cada vez que ese servicio estaba caído — y el guard
   * además REDIRIGE, así que ni siquiera se veía por qué.
   *
   * Quién puede importar de verdad lo decide el back, que es donde no se puede
   * saltar: `@RequirePermission('contratos', 'create')`.
   */
  /*
   * El estado de la migración, cuando el muro ya bajó. Todas las alertas del
   * panel —Contratos, Inquilinos, Propietarios, Cobros— traen acá; si al
   * llegar sólo se viera «subí un archivo», la persona no sabría qué le
   * quedó pendiente de los 91 contratos que ya subió. Sin botón por línea:
   * ya está en la pantalla donde se resuelve.
   */
  const deuda = useMigracionConDeuda()

  return (
    <PageGuard module="contratos">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1">
          <Link
            href="/panel/inmobiliaria/contratos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Contratos
          </Link>
          <Eyebrow>Portafolio</Eyebrow>
          <h1 className="text-h2 text-fg">
            Migrar contratos
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
            Traé los contratos que ya tenés en otro sistema, con sus inquilinos
            y su cartera. Entran vigentes y firmados: no hay que volver a
            firmarlos.{' '}
            <span className="text-foreground">
              El contrato se pega al inmueble por su código o por la dirección
            </span>{' '}
            — y si el inmueble no está cargado, se crea desde el archivo.
          </p>
        </header>

        {deuda ? (
          <>
            <VeredictoDeMigracion deuda={deuda} resolver={{}} />
            <FilasFrenadas deuda={deuda} resolver={{}} />
          </>
        ) : null}

        <MigrarContratos />
      </div>
    </PageGuard>
  )
}
