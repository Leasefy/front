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

  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="p-8 text-center">
          <p className="text-sm font-medium text-fg">Inmueble no encontrado</p>
          <p className="text-caption text-fg-muted mt-1">
            El inmueble <span className="font-mono">{id}</span> no existe en la base.
          </p>
          <Button asChild variant="outline" hideArrow><Link href="/admin/inmuebles" className="mt-4 inline-flex">
            ← Volver a Inmuebles
          </Link></Button>
        </Card>
      </div>
    )
  }

  if (error) return <div className="p-6 lg:p-8"><ErrorBlock error={error} /></div>
  if (!data) return null

  return <HistorialView historial={data} />
}
