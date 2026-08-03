import type { PillTone } from '@/lib/admin/types'

/**
 * The real avalúo certificate lifecycle states — the SAME closed set the avaluo
 * micro's sign-off state machine exposes (`STATES` in
 * `avaluo/src/avaluo/signoff/state-machine.ts`). `pagado` is intentionally
 * ABSENT: WU2 moved payment to intake, so the certificate lifecycle no longer
 * carries a `pagado` state, and `GET /avaluos?state=pagado` 422s (the micro
 * validates `state` against exactly this set).
 */
export const AVALUO_STATES = [
  'borrador',
  'en_revisión',
  'firmado',
  'rechazado',
  'entregado',
] as const

export type AvaluoStateValue = (typeof AVALUO_STATES)[number]

export interface AvaluoStateMeta {
  /** User-facing label (neutral Colombian Spanish). */
  label: string
  /** Pill tone for the badge. */
  tone: PillTone
}

const STATE_META: Record<AvaluoStateValue, AvaluoStateMeta> = {
  borrador: { label: 'Borrador', tone: 'neutral' },
  'en_revisión': { label: 'En revisión', tone: 'warn' },
  firmado: { label: 'Firmado', tone: 'ok' },
  rechazado: { label: 'Rechazado', tone: 'bad' },
  entregado: { label: 'Entregado', tone: 'info' },
}

/**
 * Presentation metadata for a certificate state. An unknown/unexpected value (a
 * future state the front has not learned yet) degrades to a neutral pill showing
 * the raw value — it never throws and never hides the row.
 */
export function avaluoStateMeta(state: string): AvaluoStateMeta {
  return STATE_META[state as AvaluoStateValue] ?? { label: state, tone: 'neutral' }
}
