'use client'

/**
 * PagoFallidoTabla — tabla de "Pagos fallidos" (visión §7).
 *
 * Superficie SOLO-UX sobre la cola humana real (useAgentWorkItems('pagos')):
 * NO existe un endpoint dedicado de fallidos, así que derivamos las filas de los
 * WorkItem[] que representan un cobro que NO se completó (estado `fallo` del ciclo
 * unificado o `intento_fallido` del ciclo de pago, o un tipo que lo declara).
 *
 * Cada fila muestra: inquilino · valor · motivo (transacción abandonada / banco
 * rechazó / link vencido / error pasarela) · acción sugerida + la acción real.
 *
 * T-323: la acción de la fila es la PRIMERA acción real declarada por el backend
 * en el WorkItem; si no hay acción real → botón deshabilitado "Próximamente"
 * (placeholder honesto, nunca un botón que finja funcionar ni un auto-rechazo).
 *
 * Tonos vía TOKENS del DS (warning/danger/fg-muted + *-soft) — CERO hex inline.
 */

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui'
import type { WorkItem, WorkItemAction } from '@/lib/api/work-item'

// ── Clasificación de motivo ──────────────────────────────────────────────────
// El backend no tipa el motivo del fallo; lo inferimos del texto del WorkItem
// (tipo + titulo + acción sugerida) hacia uno de los 4 motivos del dominio.
// Finite-map: un motivo desconocido degrada a "error pasarela" (el más neutro).

export type MotivoFallo = 'abandonada' | 'banco' | 'link_vencido' | 'pasarela'

interface MotivoMeta {
  label: string
  /** Qué hace el agente para recuperar este fallo (columna "acción sugerida"). */
  accionSugerida: string
  text: string
  bg: string
  border: string
}

const MOTIVO_META: Record<MotivoFallo, MotivoMeta> = {
  abandonada: {
    label: 'Transacción abandonada',
    accionSugerida: 'Reenviar el link de pago',
    text: 'text-warning',
    bg: 'bg-warning-soft',
    border: 'border-warning/30',
  },
  banco: {
    label: 'Banco rechazó',
    accionSugerida: 'Ofrecer otro método de pago',
    text: 'text-danger',
    bg: 'bg-danger-soft',
    border: 'border-danger/30',
  },
  link_vencido: {
    label: 'Link vencido',
    accionSugerida: 'Generar un link nuevo',
    text: 'text-warning',
    bg: 'bg-warning-soft',
    border: 'border-warning/30',
  },
  pasarela: {
    label: 'Error de pasarela',
    accionSugerida: 'Esperar y reintentar con la pasarela',
    text: 'text-fg-muted',
    bg: 'bg-surface-muted',
    border: 'border-border',
  },
}

/** Infiere el motivo del fallo a partir del texto libre del WorkItem. */
export function clasificarMotivo(item: WorkItem): MotivoFallo {
  const blob = [
    item.tipo,
    item.titulo,
    item.accionSugerida?.label,
    item.accionSugerida?.razon,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/(abandon|sin\s*terminar|no\s*complet|incomplet|expir(ó|o)\s*la\s*sesi)/.test(blob)) {
    return 'abandonada'
  }
  if (/(banco|rechaz|fondos\s*insuf|tarjeta|declinad|insufici)/.test(blob)) {
    return 'banco'
  }
  if (/(link\s*venc|enlace\s*venc|venc(ió|io)\s*el\s*link|caduc)/.test(blob)) {
    return 'link_vencido'
  }
  // pasarela / gateway / timeout / error técnico → el más neutro por defecto.
  return 'pasarela'
}

/**
 * ¿Este WorkItem representa un pago fallido? Reconoce el estado `fallo` del ciclo
 * unificado, el `intento_fallido` del ciclo de pago y los tipos que lo declaran.
 */
export function esPagoFallido(item: WorkItem): boolean {
  const estado = String(item.estado ?? '').toLowerCase()
  if (estado === 'fallo' || estado === 'intento_fallido') return true
  const tipo = String(item.tipo ?? '').toLowerCase()
  return /(fallid|fallo|intento_fallido|rechaz|abandon)/.test(tipo)
}

// ── Formateador ──────────────────────────────────────────────────────────────

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

// ── Props ────────────────────────────────────────────────────────────────────

export interface PagoFallidoTablaProps {
  /** WorkItems YA filtrados a fallidos (usa esPagoFallido aguas arriba). */
  items: WorkItem[]
  /** Posta la acción a su endpoint real; devuelve ok/error para el toast. */
  onAction?: (
    item: WorkItem,
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  /** Abre el detalle del caso. */
  onOpen?: (item: WorkItem) => void
}

// ── Fila ──────────────────────────────────────────────────────────────────────

function FilaFallido({
  item,
  onAction,
  onOpen,
}: {
  item: WorkItem
  onAction?: PagoFallidoTablaProps['onAction']
  onOpen?: (item: WorkItem) => void
}) {
  const [busy, setBusy] = useState(false)
  const motivo = MOTIVO_META[clasificarMotivo(item)] ?? MOTIVO_META.pasarela

  // Primera acción REAL sin motivo: la fila es un atajo de un clic; los flujos
  // con motivo viven en el detalle del caso.
  const accionReal = item.actions.find((a) => !a.requiresReason)
  const ejecutable = Boolean(accionReal && onAction)

  // Inquilino: nombre enmascarado del sujeto, o el título del caso como respaldo.
  const inquilino = item.subject?.masked?.trim() || item.titulo

  async function run() {
    if (!accionReal || !onAction) return
    setBusy(true)
    const res = await onAction(item, accionReal)
    setBusy(false)
    if (res.ok) toast.success(`${accionReal.label} · listo`)
    else toast.error(`No se pudo completar: ${res.error ?? 'error'}`)
  }

  return (
    <tr className="border-t border-border align-top">
      {/* Inquilino */}
      <td className="py-3 pr-4">
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="text-left text-sm font-medium text-fg leading-snug rounded-md hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {inquilino}
          </button>
        ) : (
          <p className="text-sm font-medium text-fg leading-snug">{inquilino}</p>
        )}
        {item.titulo && item.titulo !== inquilino && (
          <p className="text-xs text-fg-muted mt-0.5 leading-snug">{item.titulo}</p>
        )}
      </td>

      {/* Valor */}
      <td className="py-3 pr-4 whitespace-nowrap">
        <span className="text-sm text-fg tabular-nums">
          {typeof item.amountCop === 'number' ? copFormatter.format(item.amountCop) : '—'}
        </span>
      </td>

      {/* Motivo */}
      <td className="py-3 pr-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${motivo.text} ${motivo.bg} ${motivo.border}`}
        >
          {motivo.label}
        </span>
      </td>

      {/* Acción sugerida */}
      <td className="py-3 pr-4">
        <p className="text-sm text-fg leading-snug">{motivo.accionSugerida}</p>
        {item.accionSugerida?.razon && (
          <p className="text-xs text-fg-muted mt-0.5 leading-snug">{item.accionSugerida.razon}</p>
        )}
      </td>

      {/* Acción */}
      <td className="py-3 text-right whitespace-nowrap">
        {ejecutable ? (
          <Button size="sm" variant="secondary" hideArrow isLoading={busy} onClick={run}>
            {accionReal!.label}
          </Button>
        ) : (
          // T-323: sin acción real → placeholder honesto deshabilitado.
          <Button size="sm" variant="outline" hideArrow disabled title="Próximamente">
            Próximamente
          </Button>
        )}
      </td>
    </tr>
  )
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function PagoFallidoTabla({ items, onAction, onOpen }: PagoFallidoTablaProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            <th scope="col" className="py-2.5 px-4 font-medium">Inquilino</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Valor</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Motivo</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Acción sugerida</th>
            <th scope="col" className="py-2.5 px-4 font-medium text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
          {items.map((item) => (
            <FilaFallido key={item.id} item={item} onAction={onAction} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
