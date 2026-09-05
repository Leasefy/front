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
import { toast } from '@/components/ui/toast'

import {
  Button,
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
  /** Variant del Badge de Cadence para el pill de motivo. */
  variant: 'warning' | 'destructive' | 'secondary'
}

const MOTIVO_META: Record<MotivoFallo, MotivoMeta> = {
  abandonada: {
    label: 'Transacción abandonada',
    accionSugerida: 'Reenviar el link de pago',
    variant: 'warning',
  },
  banco: {
    label: 'Banco rechazó',
    accionSugerida: 'Ofrecer otro método de pago',
    variant: 'destructive',
  },
  link_vencido: {
    label: 'Link vencido',
    accionSugerida: 'Generar un link nuevo',
    variant: 'warning',
  },
  pasarela: {
    label: 'Error de pasarela',
    accionSugerida: 'Esperar y reintentar con la pasarela',
    variant: 'secondary',
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
    <TableRow className="border-t border-border align-top">
      {/* Inquilino */}
      <TableCell className="py-3 pr-4">
        {onOpen ? (
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={() => onOpen(item)}
            className="h-auto p-0 text-left text-sm font-medium text-fg leading-snug underline-offset-4 hover:underline"
          >
            {inquilino}
          </Button>
        ) : (
          <p className="text-sm font-medium text-fg leading-snug">{inquilino}</p>
        )}
        {item.titulo && item.titulo !== inquilino && (
          <p className="text-xs text-fg-muted mt-0.5 leading-snug">{item.titulo}</p>
        )}
      </TableCell>

      {/* Valor */}
      <TableCell className="py-3 pr-4 whitespace-nowrap">
        <span className="text-sm text-fg tabular-nums">
          {typeof item.amountCop === 'number' ? copFormatter.format(item.amountCop) : '—'}
        </span>
      </TableCell>

      {/* Motivo */}
      <TableCell className="py-3 pr-4">
        <Badge variant={motivo.variant}>{motivo.label}</Badge>
      </TableCell>

      {/* Acción sugerida */}
      <TableCell className="py-3 pr-4">
        <p className="text-sm text-fg leading-snug">{motivo.accionSugerida}</p>
        {item.accionSugerida?.razon && (
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

export function PagoFallidoTabla({ items, onAction, onOpen }: PagoFallidoTablaProps) {
  /**
   * Paginado de presentación: la cola de pagos fallidos viene de
   * `useAgentWorkItems('pagos')` sin `page`/`pageSize` y crece con el volumen
   * de inquilinos. No hay filtros en este componente ⇒ sin `resetKey`.
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(items)

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table className="min-w-[720px] text-left">
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="px-4">Inquilino</TableHead>
            <TableHead scope="col" className="pr-4">Valor</TableHead>
            <TableHead scope="col" className="pr-4">Motivo</TableHead>
            <TableHead scope="col" className="pr-4">Acción sugerida</TableHead>
            <TableHead scope="col" className="px-4 text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
          {pageItems.map((item) => (
            <FilaFallido key={item.id} item={item} onAction={onAction} onOpen={onOpen} />
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
