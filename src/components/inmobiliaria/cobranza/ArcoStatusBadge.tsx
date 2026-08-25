'use client'

/**
 * ArcoStatusBadge — estado de una solicitud ARCO.
 *
 * Envuelve el `StatusBadge` de Cadence: el punto, el tinte, el radio y la
 * tipografía salen del DS. Acá sólo vive el mapeo de estado → tono semántico,
 * que es conocimiento de dominio y no del sistema de diseño.
 *
 * Antes era un `<span>` con clases escritas a mano, que replicaba a ojo lo que
 * el DS ya resuelve.
 */

import { StatusBadge, type SemanticTone } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'

/**
 * Los cinco estados que la tabla admite, copiados del CHECK de
 * `agent.arco_requests` (`arco_requests_status_check`).
 *
 * Acá figuraba también `pending_counsel_review`, que NO es un estado: es un
 * flag del cuerpo del 503 que devuelve el gate de asesor jurídico
 * (`{ pending_counsel_review: true, contact: … }`). La base lo rechaza por
 * constraint, así que jamás podía llegar en una solicitud.
 */
export type ArcoStatus =
  | 'pending_email_verification'
  | 'pending_admin_triage'
  | 'in_progress'
  | 'resolved'
  | 'rejected'

export type ArcoStatusBadgeProps = {
  status: ArcoStatus
  className?: string
}

const STATUS_TONE: Record<ArcoStatus, SemanticTone> = {
  // El reloj legal todavía no arranca: no es bueno ni malo.
  pending_email_verification: 'neutral',
  // Llegó y nadie la tomó — es lo que hay que mover.
  pending_admin_triage: 'warning',
  in_progress: 'info',
  resolved: 'success',
  rejected: 'critical',
}

const FALLBACK_TONE: SemanticTone = 'warning'

export function ArcoStatusBadge({ status, className }: ArcoStatusBadgeProps) {
  const { t } = useI18n()

  return (
    <StatusBadge tone={STATUS_TONE[status] ?? FALLBACK_TONE} className={className}>
      {t(`inmobiliaria.ai.arco.status.${status}`)}
    </StatusBadge>
  )
}
