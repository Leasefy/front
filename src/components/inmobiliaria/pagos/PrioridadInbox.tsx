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
import { toast } from '@/components/ui/toast'
import { Warning } from '@phosphor-icons/react'

import {
  Button,
  EmptyState,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
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

  const prioridadVariant =
    prioridad === 'alta' ? 'destructive' : prioridad === 'media' ? 'warning' : 'success'

  return (
    <TableRow className="align-top">
      {/* Prioridad */}
      <TableCell className="py-3 pr-3 whitespace-nowrap">
        <Badge variant={prioridadVariant}>{pri.label}</Badge>
      </TableCell>

      {/* Caso */}
      <TableCell className="py-3 pr-4">
        <p className="text-sm font-medium text-fg leading-snug">{item.titulo}</p>
        {item.subject?.masked && (
          <p className="text-xs text-fg-muted mt-0.5">{item.subject.masked}</p>
        )}
      </TableCell>

      {/* Motivo (acción sugerida del agente) */}
      <TableCell className="py-3 pr-4">
        <p className="text-sm text-fg leading-snug">{item.accionSugerida.label}</p>
        {item.accionSugerida.razon && (
          <p className="text-xs text-fg-muted mt-0.5 leading-snug">{item.accionSugerida.razon}</p>
        )}
      </TableCell>

      {/* Acción */}
      <TableCell className="py-3 text-right whitespace-nowrap">
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
      </TableCell>
    </TableRow>
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

  /**
   * Paginado de presentación: misma cola que `PagoFallidoTabla`
   * (`useAgentWorkItems('pagos')`, sin page/pageSize en el endpoint).
   *
   * Va ANTES del early-return de carga: un hook detrás de un `return`
   * condicional rompe el orden de hooks de React.
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(sorted)

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
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Prioridad</TableHead>
            <TableHead className="pr-4">Caso</TableHead>
            <TableHead className="pr-4">Motivo</TableHead>
            <TableHead className="px-4 text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
          {pageItems.map((item) => (
            <InboxRow key={item.id} item={item} onAction={onAction} />
          ))}
        </TableBody>
      </Table>

      {/* Pie: sólo si hay más de una página. */}
      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}
