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

import { PageGuard } from '@/components/auth/PageGuard'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { ROLES_DE_CONTRATOS } from '@/lib/contratos/roles-de-contratos'
import { MigrarContratos } from '@/components/contratos/MigrarContratos'
import {
  FilasFrenadas,
  VeredictoDeMigracion,
} from '@/components/migracion/VeredictoDeMigracion'
import { useDeudaDeMigracion } from '@/lib/hooks/use-migracion-con-deuda'
import { usePermissions } from '@/lib/hooks/usePermissions'

export default function MigrarContratosPage() {
  /*
   * Guard por "view", no por "create". `canAccess(modulo, accion)` en false NO
   * siempre significa "no tienes permiso": también es lo que devuelve mientras
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
   * llegar sólo se viera «sube un archivo», la persona no sabría qué le
   * quedó pendiente de los 91 contratos que ya subió. Sin botón por línea:
   * ya está en la pantalla donde se resuelve.
   */
  const { deuda, recargar } = useDeudaDeMigracion()
  /*
   * 🔴 QA-CONT-95 (MC-15): quien sólo VE contratos (el contador, el de sólo
   * lectura) veía «Descartar», «Retomar» y el cargador, y el back le respondía
   * 403 al tocarlos. Ve cómo quedó la migración y se le dice que subir y
   * activar es de quien crea contratos. El guard sigue por «view» (ver arriba):
   * esto sólo cambia lo que se le ofrece, y el administrador nunca lo pierde.
   */
  const { canAccess, isAdmin, isLoading } = usePermissions()
  const soloLectura = !isLoading && !isAdmin && !canAccess('contratos', 'create')

  return (
    <PageGuard module="contratos" roles={ROLES_DE_CONTRATOS}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contratos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Contratos
          </Link>
          <EncabezadoDePantalla
            seccion="Operación"
            titulo="Migrar contratos"
            descripcion="Trae los contratos que ya tienes en otro sistema, con sus inquilinos y su cartera. Entran vigentes y firmados."
            ayuda={
              <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: migrar contratos" variante="secundario">
                <div className="space-y-3 text-body-sm text-fg-muted">
                  <p>Los contratos entran vigentes y firmados: no hay que volver a firmarlos.</p>
                  <p>
                    <span className="text-fg">El contrato se pega al inmueble por su código o por la dirección</span>; si
                    el inmueble no está cargado, se crea desde el archivo.
                  </p>
                  <p>Lo que no entra queda frenado con su motivo, para resolverlo aquí mismo.</p>
                </div>
              </ParaEntenderMas>
            }
          />
        </div>

        {deuda ? (
          <>
            <VeredictoDeMigracion deuda={deuda} resolver={{}} />
            <FilasFrenadas deuda={deuda} resolver={{}} />
          </>
        ) : null}

        {soloLectura ? (
          <p
            className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-fg-muted"
            data-testid="migrar-solo-lectura"
          >
            Tu rol puede ver cómo quedó la migración, pero no subir archivos ni activar contratos: eso
            lo hace quien crea contratos en la inmobiliaria.{' '}
            <Link href="/panel/inmobiliaria/contratos" className="font-medium text-primary hover:underline">
              Volver a Contratos
            </Link>
          </p>
        ) : (
          <MigrarContratos onLoteCambio={() => void recargar()} />
        )}
      </div>
    </PageGuard>
  )
}
