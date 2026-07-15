'use client'

/**
 * DecisionTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * El alma del detalle: renderiza la DECISIÓN explicada derivada del motor
 * (deriveEstudioDecision) vía <DecisionCard>. UX-only — emite `onAction(code)`
 * que la página relayea al rail / handlers (T-323: nunca un rechazo automático).
 */

import { DecisionCard } from '@/components/inmobiliaria/estudio/DecisionCard'
import type { EstudioActionCode, EstudioDecision } from '@/lib/estudio/decision'

interface DecisionTabProps {
  decision: EstudioDecision
  onAction?: (code: EstudioActionCode) => void
}

export function DecisionTab({ decision, onAction }: DecisionTabProps) {
  return <DecisionCard decision={decision} onAction={onAction} />
}
