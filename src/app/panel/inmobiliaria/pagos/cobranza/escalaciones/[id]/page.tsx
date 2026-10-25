'use client'

/**
 * Ficha de una escalación (enlaces profundos y notificaciones). El cuerpo vive
 * en `EscalationDetailClient`, que también monta el cajón de la lista
 * (ronda 30, K4, Nico: «K4 cajón»).
 */

import { useParams } from 'next/navigation'

import { PageGuard } from '@/components/auth/PageGuard'
import EscalationDetailClient from './EscalationDetailClient'

export default function EscalationDetailPage() {
  const params = useParams()
  const escalationId = typeof params?.id === 'string' ? params.id : null
  return (
    <PageGuard module="cobranza">
      <EscalationDetailClient escalationId={escalationId} />
    </PageGuard>
  )
}
