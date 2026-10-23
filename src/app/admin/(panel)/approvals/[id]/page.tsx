'use client'

import { useParams } from 'next/navigation'

import { DetalleDeLaAprobacion } from '../DetalleDeLaAprobacion'

/**
 * /admin/approvals/:id — la decisión en su propia página, para los enlaces directos (un correo, la bitácora).
 * Desde la cola se abre en un cajón (ronda 26); las dos usan el mismo `DetalleDeLaAprobacion`.
 */
export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>()
  return <DetalleDeLaAprobacion id={params.id} />
}
