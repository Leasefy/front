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
 * en el WorkItem. Sin acción real NO se pinta ningún botón (revisora r25,
 * bloqueante: el «Próximamente» apagado de cada fila no hacía nada; lo que no
 * se puede no se ofrece). La fila abre su detalle.
 *
 * Glow up (ronda 26): «enlace de pago», nunca «link» (decisión de Nico); las
 * pestañas por lo que conviene hacer, con su conteo, y el buscador DENTRO de la
 * tarjeta; la paginación al pie; tarjetas bajo 768 px; letra de 13 px.
 *
 * Tonos vía TOKENS del DS (warning/danger/fg-muted + *-soft) — CERO hex inline.
 */

import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Card } from '@leasefy/cadence'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

import {
  Button,
  Badge,
  Input,
  Table,
  TableHeader,
  TableBodyAnimado,
  TableHead,
  TableRow,
  TableRowAnimada,
  TableCell,
} from '@/components/ui'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import type { WorkItem, WorkItemAction } from '@/lib/api/work-item'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

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
    accionSugerida: 'Reenviar el enlace de pago',
    variant: 'warning',
  },
  banco: {
    label: 'Banco rechazó',
    accionSugerida: 'Ofrecer otro medio de pago',
    variant: 'destructive',
  },
  link_vencido: {
    label: 'Enlace vencido',
    accionSugerida: 'Generar un enlace nuevo',
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

// ── Lo que conviene hacer (las pestañas) ─────────────────────────────────────

/** Los cuatro motivos se leen como tres trabajos: reenviar, ofrecer otro medio o esperar. */
export type QueHacer = 'reenviar' | 'otro' | 'esperar'

export function queHacerCon(motivo: MotivoFallo): QueHacer {
  if (motivo === 'banco') return 'otro'
  if (motivo === 'pasarela') return 'esperar'
  return 'reenviar'
}

export const QUE_HACER_LABEL: Record<QueHacer, string> = {
  reenviar: 'Reenviar el enlace',
  otro: 'Ofrecer otro medio de pago',
  esperar: 'Esperar y reintentar',
}

type Filtro = 'todos' | QueHacer

// ── Formateador ──────────────────────────────────────────────────────────────

const copFormatter = plataEnPantalla(localeDeLasCifras, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** El valor del cobro en pantalla («$ 1.250.000»), o «—» si no vino. */
export function valorDelFallido(item: WorkItem): string {
  return typeof item.amountCop === 'number' ? copFormatter.format(item.amountCop) : '—'
}

/** Quién debe: el nombre enmascarado del sujeto, o el título del caso como respaldo. */
export function inquilinoDelFallido(item: WorkItem): string {
  return item.subject?.masked?.trim() || item.titulo
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface PagoFallidoTablaProps {
  /** WorkItems YA filtrados a fallidos (usa esPagoFallido aguas arriba). */
  items: WorkItem[]
  /** Posta la acción a su endpoint real; devuelve ok/error para el toast. */
  onAction?: (
    item: WorkItem,
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string; fallo?: unknown }>
  /** Abre el detalle del caso (un cajón). */
  onOpen?: (item: WorkItem) => void
}

// ── La acción de un clic ──────────────────────────────────────────────────────

/** Primera acción REAL sin motivo: la fila es un atajo de un clic; los flujos con motivo viven en el detalle. */
export function accionDeUnClic(item: WorkItem): WorkItemAction | undefined {
  return item.actions.find((a) => !a.requiresReason)
}

export function BotonDeLaAccion({
  item,
  onAction,
  className,
}: {
  item: WorkItem
  onAction?: PagoFallidoTablaProps['onAction']
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const accionReal = accionDeUnClic(item)
  if (!accionReal || !onAction) return null

  async function run() {
    if (!accionReal || !onAction) return
    setBusy(true)
    const res = await onAction(item, accionReal)
    setBusy(false)
    if (res.ok) toast.success(`${accionReal.label} · listo`)
    // 02-10-2026 · Por el traductor, no el código crudo del micro («403»,
    // «not_configured»): un 4xx dice qué pasó, un 5xx que fue nuestro con la
    // referencia, y sólo sin respuesta se habla de la conexión.
    else
      toast.error(
        mensajeParaLaPersona(res.fallo ?? null, {
          porDefecto: `No se pudo completar «${accionReal.label}». Prueba de nuevo en un momento.`,
          accion: `completar «${accionReal.label}»`,
        }),
      )
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      hideArrow
      isLoading={busy}
      onClick={(e) => {
        e.stopPropagation()
        void run()
      }}
      className={className}
    >
      {accionReal.label}
    </Button>
  )
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
  const motivo = MOTIVO_META[clasificarMotivo(item)] ?? MOTIVO_META.pasarela
  const inquilino = inquilinoDelFallido(item)
  const abrir = onOpen ? () => onOpen(item) : undefined

  return (
    <TableRowAnimada
      data-testid={`fallido-${item.id}`}
      onClick={abrir}
      tabIndex={abrir ? 0 : undefined}
      role={abrir ? 'button' : undefined}
      aria-label={abrir ? `Ver el pago fallido de ${inquilino}` : undefined}
      onKeyDown={
        abrir
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                abrir()
              }
            }
          : undefined
      }
      className={
        'align-top max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0' +
        (abrir ? ' cursor-pointer hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none' : '')
      }
    >
      {/* Inquilino */}
      <TableCell className="py-3 pr-4 max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
        <p className="text-body-sm font-medium text-fg leading-snug">{inquilino}</p>
        {item.titulo && item.titulo !== inquilino && (
          <p className="text-caption text-fg-muted mt-0.5 leading-snug">{item.titulo}</p>
        )}
      </TableCell>

      {/* Valor */}
      <TableCell className="py-3 pr-4 whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
        <span className="font-mono text-body-sm text-fg tabular-nums">{valorDelFallido(item)}</span>
      </TableCell>

      {/* Motivo */}
      <TableCell className="py-3 pr-4 max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
        <Badge variant={motivo.variant}>{motivo.label}</Badge>
      </TableCell>

      {/* Acción sugerida */}
      <TableCell className="py-3 pr-4 max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0">
        <p className="text-body-sm text-fg leading-snug max-md:text-caption max-md:text-fg-muted">{motivo.accionSugerida}</p>
        {item.accionSugerida?.razon && (
          <p className="text-caption text-fg-muted mt-0.5 leading-snug max-md:hidden">{item.accionSugerida.razon}</p>
        )}
      </TableCell>

      {/* Acción — sólo si el back declaró una real (nada de «Próximamente»). */}
      <TableCell className="py-3 text-right whitespace-nowrap max-md:col-span-2 max-md:block max-md:p-0 max-md:pt-1 max-md:text-left">
        <BotonDeLaAccion item={item} onAction={onAction} className="max-md:w-full" />
      </TableCell>
    </TableRowAnimada>
  )
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function PagoFallidoTabla({ items, onAction, onOpen }: PagoFallidoTablaProps) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')

  const conteo = useMemo(() => {
    const c: Record<QueHacer, number> = { reenviar: 0, otro: 0, esperar: 0 }
    for (const item of items) c[queHacerCon(clasificarMotivo(item))] += 1
    return c
  }, [items])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter((item) => {
      if (filtro !== 'todos' && queHacerCon(clasificarMotivo(item)) !== filtro) return false
      if (!q) return true
      return [inquilinoDelFallido(item), item.titulo].some((v) => (v ?? '').toLowerCase().includes(q))
    })
  }, [items, filtro, busqueda])

  /** Paginado de presentación: la cola crece con el volumen de inquilinos. */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(visibles, { resetKey: `${filtro}|${busqueda}` })

  return (
    <Card className="overflow-hidden" data-testid="fallidos-tabla">
      {/* Las pestañas (lo que conviene hacer, con su conteo) y el buscador, DENTRO de la tarjeta. */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <PestanasDeEstado<Filtro>
          pestanas={[
            { valor: 'todos', etiqueta: 'Todos', cuantos: items.length, fija: true, testid: 'fallidos-pestana-todos' },
            { valor: 'reenviar', etiqueta: QUE_HACER_LABEL.reenviar, cuantos: conteo.reenviar, tono: 'aviso', testid: 'fallidos-pestana-reenviar' },
            { valor: 'otro', etiqueta: QUE_HACER_LABEL.otro, cuantos: conteo.otro, testid: 'fallidos-pestana-otro' },
            { valor: 'esperar', etiqueta: QUE_HACER_LABEL.esperar, cuantos: conteo.esperar, testid: 'fallidos-pestana-esperar' },
          ]}
          valor={filtro}
          onCambio={setFiltro}
          etiqueta="Filtrar los pagos fallidos por lo que conviene hacer"
        />
        <div className="relative w-full md:w-64">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar inquilino"
            aria-label="Buscar por inquilino"
            className="pl-9"
            data-testid="fallidos-buscar"
          />
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-body-sm font-medium text-fg">Ningún pago fallido con ese filtro</p>
          <p className="mt-1 text-caption text-fg-muted">Cambia la pestaña o borra la búsqueda para ver los demás.</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-md:overflow-visible">
          <Table className="text-left max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead scope="col" className="px-4">Inquilino</TableHead>
                <TableHead scope="col" className="pr-4">Valor</TableHead>
                <TableHead scope="col" className="pr-4">Motivo</TableHead>
                <TableHead scope="col" className="pr-4">Qué conviene hacer</TableHead>
                <TableHead scope="col" className="px-4 text-right">
                  <span className="sr-only">Acción</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            {/* Filtrar o paginar: las filas entran escalonadas (techo 320 ms). */}
            <TableBodyAnimado className="max-md:block md:[&_td:first-child]:pl-4 md:[&_td:last-child]:pr-4">
              {pageItems.map((item) => (
                <FilaFallido key={item.id} item={item} onAction={onAction} onOpen={onOpen} />
              ))}
            </TableBodyAnimado>
          </Table>
        </div>
      )}

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
    </Card>
  )
}

export { MOTIVO_META }
