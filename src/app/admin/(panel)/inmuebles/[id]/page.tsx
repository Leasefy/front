'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ApiError } from '@/lib/admin/api'
import { historialDelInmueble, type HistorialDelInmueble } from '@/lib/admin/inmuebles'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { HistorialView } from './HistorialView'
import { Card } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'

/**
 * /admin/inmuebles/:id — historial interno de riesgo de un inmueble
 * (`GET /api/v1/admin/inmuebles/:id/historial`). Carga y estados acá; la
 * pintura vive en `HistorialView`, que es pura y se prueba sin red.
 */
export default function HistorialDelInmueblePage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data, isLoading, error } = useApiQuery<HistorialDelInmueble>(
    (signal) => historialDelInmueble(id, signal),
    [id],
  )

  // La vuelta está desde el primer cuadro: cargando, con error o sin inmueble.
  const volver = <BackButton href="/admin/inmuebles" label="Volver a inmuebles" />

  if (isLoading) return <div className="space-y-6 p-6 lg:p-8">{volver}<LoadingBlock /></div>

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        {volver}
        <Card className="p-8 text-center">
          <p className="text-sm font-medium text-fg">Inmueble no encontrado</p>
          <p className="text-caption text-fg-muted mt-1">
            El inmueble <span className="font-mono">{id}</span> no existe en la base.
          </p>
          <Button asChild variant="outline" className="mt-4"><Link href="/admin/inmuebles">
            Ver todos los inmuebles
          </Link></Button>
        </Card>
      </div>
    )
  }

  if (error) return <div className="space-y-6 p-6 lg:p-8">{volver}<ErrorBlock error={error} /></div>
  if (!data) return null

  return <HistorialView historial={data} />
}
