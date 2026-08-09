/**
 * dispute-vocab.ts — cómo se DICE una disputa en pantalla.
 *
 * Mismo rol que `call-vocab.ts` y `compliance-vocab.ts`: traducir los slugs del
 * backend y NUNCA pintar uno crudo. Vive aparte de los componentes porque lo
 * comparten la lista y el panel de detalle.
 */

import type { Badge } from '@leasefy/cadence'
import type * as React from 'react'
import type { CobranzaDispute, DisputeStatus } from '@/lib/hooks/cobranza/use-disputes'

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>

/** Estado → variant del Badge de Cadence + etiqueta legible. */
export const DISPUTE_ESTADO: Record<
  DisputeStatus,
  { variant: BadgeVariant; label: string }
> = {
  open: { variant: 'warning', label: 'Abierta' },
  in_review: { variant: 'info', label: 'En revisión' },
  resolved: { variant: 'success', label: 'Resuelta' },
}

/** Etiqueta legible por resultado de resolución. */
export const DISPUTE_OUTCOME_LABEL: Record<string, string> = {
  procedente: 'Procedente',
  improcedente: 'Improcedente',
  parcial: 'Parcial',
}

/** Normaliza un status crudo del backend a uno conocido (caída a `open`). */
export function asDisputeStatus(raw: string): DisputeStatus {
  return raw === 'in_review' || raw === 'resolved' ? raw : 'open'
}

/**
 * Enmascara un debtor_id (UUID) a un identificador corto: las últimas 6
 * posiciones. Sólo como CAÍDA cuando el endpoint no pudo unir el nombre.
 */
export function maskDebtorId(debtorId: string): string {
  const clean = debtorId.replace(/-/g, '')
  const tail = clean.slice(-6).toUpperCase()
  return tail ? `Deudor ••${tail}` : 'Deudor'
}

/** Nombre del deudor, con caída explícita al id enmascarado. Nunca se inventa. */
export function debtorLabel(d: CobranzaDispute): string {
  const name = d.debtor_name?.trim()
  return name && name.length > 0 ? name : maskDebtorId(d.debtor_id)
}

/** Etiqueta del resultado, o null si todavía no se resolvió. */
export function outcomeLabel(d: CobranzaDispute): string | null {
  if (d.outcome == null) return null
  return DISPUTE_OUTCOME_LABEL[d.outcome] ?? d.outcome
}
