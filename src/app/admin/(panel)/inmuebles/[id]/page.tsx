'use client'

import { useParams } from 'next/navigation'

import { DetalleDelInmueble } from '../DetalleDelInmueble'

/**
 * /admin/inmuebles/:id — el historial del inmueble en su propia página, para los enlaces directos. Desde
 * la lista se abre en un cajón (ronda 26); las dos usan `DetalleDelInmueble`.
 */
export default function HistorialDelInmueblePage() {
  const params = useParams<{ id: string }>()
  return <DetalleDelInmueble id={params.id} />
}
