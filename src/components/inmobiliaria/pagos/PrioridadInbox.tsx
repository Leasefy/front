'use client'

/**
 * PrioridadInbox — la tabla "Qué necesita tu atención" de la home de Pagos IA
 * (visión §3). Recibe los WorkItem[] de useAgentWorkItems('pagos') y los muestra
 * como filas priorizadas: prioridad (alta/media/baja con su tono token) · caso ·
 * motivo (acción sugerida del agente) · acción.
 *
 * Reutilizable (props: items, onAction?, isLoading). La acción de cada fila es la
 * PRIMERA acción real declarada por el backend en el WorkItem; si el item no trae
 * acciones reales, T-323 manda: render de un botón deshabilitado "Próximamente"
 * (placeholder honesto, jamás un botón que finja funcionar ni un auto-rechazo).
 *
 * Tonos vía TOKENS del DS (danger/warning/success/fg-muted + *-soft) — sin hex.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Warning } from '@phosphor-icons/react'

import { Button, EmptyState } from '@/components/ui'
import type { Severidad, WorkItem, WorkItemAction } from '@/lib/api/work-item'

// ── Prioridad: colapsa las 4 severidades en 3 niveles con tono token ─────────

type Prioridad = 'alta' | 'media' | 'baja'

const SEVERIDAD_A_PRIORIDAD: Record<Severidad, Prioridad> = {
  critica: 'alta',
  alta: 'alta',
  media: 'media',
  baja: 'baja',
}

const PRIORIDAD_RANK: Record<Prioridad, number> = { alta: 2, media: 1, baja: 0 }

const PRIORIDAD_META: Record<Prioridad, { label: string; text: string; bg: string; border: string }> = {
  alta: { label: 'Alta', text: 'text-danger', bg: 'bg-danger-soft', border: 'border-danger/30' },
  media: { label: 'Media', text: 'text-warning', bg: 'bg-warning-soft', border: 'border-warning/30' },
  baja: { label: 'Baja', text: 'text-success', bg: 'bg-success-soft', border: 'border-success/30' },
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface PrioridadInboxProps {
  items: WorkItem[]
  /** Posta la acción a su endpoint real; devuelve ok/error para el toast. */
  onAction?: (
    item: WorkItem,
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>
  isLoading?: boolean
}

// ── Fila ──────────────────────────────────────────────────────────────────────

function InboxRow({
  item,
  onAction,
}: {
  item: WorkItem
  onAction?: PrioridadInboxProps['onAction']
}) {
  const [busy, setBusy] = useState(false)
  const prioridad = SEVERIDAD_A_PRIORIDAD[item.severidad] ?? 'media'
  const pri = PRIORIDAD_META[prioridad]

  // Primera acción REAL declarada por el backend (sin requiresReason: la fila es
  // un atajo de un clic; los flujos con motivo viven en la cola humana / detalle).
  const accionReal = item.actions.find((a) => !a.requiresReason)
  const ejecutable = Boolean(accionReal && onAction)

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
      {/* Prioridad */}
      <td className="py-3 pr-3 whitespace-nowrap">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${pri.text} ${pri.bg} ${pri.border}`}
        >
          {pri.label}
        </span>
      </td>

      {/* Caso */}
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-fg leading-snug">{item.titulo}</p>
        {item.subject?.masked && (
          <p className="text-xs text-fg-muted mt-0.5">{item.subject.masked}</p>
        )}
      </td>

      {/* Motivo (acción sugerida del agente) */}
      <td className="py-3 pr-4">
        <p className="text-sm text-fg leading-snug">{item.accionSugerida.label}</p>
        {item.accionSugerida.razon && (
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

export function PrioridadInbox({ items, onAction, isLoading }: PrioridadInboxProps) {
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const pa = PRIORIDAD_RANK[SEVERIDAD_A_PRIORIDAD[a.severidad] ?? 'media']
        const pb = PRIORIDAD_RANK[SEVERIDAD_A_PRIORIDAD[b.severidad] ?? 'media']
        if (pb !== pa) return pb - pa
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [items],
  )

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg border border-border bg-surface-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Warning}
        title="Todo al día"
        description="No hay pagos que requieran tu atención en este momento."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            <th scope="col" className="py-2.5 px-4 font-medium">Prioridad</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Caso</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Motivo</th>
            <th scope="col" className="py-2.5 px-4 font-medium text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
          {sorted.map((item) => (
            <InboxRow key={item.id} item={item} onAction={onAction} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
