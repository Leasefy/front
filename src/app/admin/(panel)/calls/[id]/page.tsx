'use client'

import { useParams } from 'next/navigation'

import { DetalleDeLaLlamada } from '../DetalleDeLaLlamada'

/**
 * /admin/calls/:id — la llamada en su propia página, para los enlaces directos. Desde la lista se abre en
 * un cajón (ronda 26); las dos usan el mismo `DetalleDeLaLlamada`.
 */
export default function CallDetailPage() {
  const params = useParams<{ id: string }>()
  return <DetalleDeLaLlamada id={params.id} />
}
