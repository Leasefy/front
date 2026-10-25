'use client'

import Link from 'next/link'
import { Card } from '@leasefy/cadence'
import { ApiError } from '@/lib/admin/api'
import { historialDelInmueble, type HistorialDelInmueble } from '@/lib/admin/inmuebles'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { HistorialView } from './[id]/HistorialView'

/**
 * El historial interno de riesgo de un inmueble (`GET /api/v1/admin/inmuebles/:id/historial`): carga y
 * estados acá; la pintura vive en `HistorialView`, que es pura y se prueba sin red. Ronda 26 (revisora r25,
 * «cajón ✗»): sirve para el CAJÓN de la lista y para la página `/admin/inmuebles/:id` (enlaces directos).
 */
export function DetalleDelInmueble({ id, enCajon = false }: { id: string; enCajon?: boolean }) {
  const { data, isLoading, error, refetch } = useApiQuery<HistorialDelInmueble>(
    (signal) => historialDelInmueble(id, signal),
    [id],
  )

  const envoltura = enCajon ? 'space-y-5' : 'space-y-6 p-6 lg:p-8'
  // En su página, la vuelta está desde el primer cuadro: cargando, con error o sin inmueble.
  const volver = enCajon ? null : <BackButton href="/admin/inmuebles" label="Volver a inmuebles" />

  if (isLoading)
    return (
      <div className={envoltura}>
        {volver}
        <LoadingBlock />
      </div>
    )

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className={envoltura}>
        {volver}
        <Card className="p-8 text-center">
          <p className="text-body-sm font-medium text-fg">No encontramos este inmueble</p>
          <p className="mt-1 text-caption text-fg-muted">Ya no está en la base: pudo borrarse o el enlace está mal.</p>
          {enCajon ? null : (
            <Button asChild variant="outline" hideArrow className="mt-4">
              <Link href="/admin/inmuebles">Ver todos los inmuebles</Link>
            </Button>
          )}
        </Card>
      </div>
    )
  }

  if (error)
    return (
      <div className={envoltura}>
        {volver}
        <ErrorBlock error={error} onReintentar={refetch} titulo="No pudimos abrir este inmueble" />
      </div>
    )
  if (!data) return null

  return <HistorialView historial={data} enCajon={enCajon} />
}
