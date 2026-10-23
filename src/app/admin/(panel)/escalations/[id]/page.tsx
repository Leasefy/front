'use client'

import { useParams } from 'next/navigation'

import { DetalleDeLaEscalacion } from '../DetalleDeLaEscalacion'

/**
 * /admin/escalations/:id — la escalación en su propia página, para los enlaces directos (FRONT.md §6.14 ·
 * BACK.md §8.11). Desde la lista se abre en un cajón (ronda 26); las dos usan `DetalleDeLaEscalacion`.
 */
export default function EscalationDetailPage() {
  const params = useParams<{ id: string }>()
  return <DetalleDeLaEscalacion id={params.id} />
}
