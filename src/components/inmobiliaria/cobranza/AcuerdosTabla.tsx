'use client'

/**
 * AcuerdosTabla — la tabla única de acuerdos de pago.
 *
 * Anatomía canónica del panel (la misma de Pagos, Llamadas, Cartas y
 * Siniestros):
 *
 *   Card
 *    ├─ barra de filtros   (border-b)
 *    ├─ tabla              (overflow-x-auto)
 *    └─ paginación         (border-t, sólo si hay más de una página)
 *
 * Todo queda DENTRO de la Card. Antes el estado vacío flotaba suelto en medio
 * de la pantalla, sin nada que lo contuviera.
 */

import { useMemo } from 'react'
import { CaretRight, Handshake } from '@phosphor-icons/react'
import { Card, SegmentedControl } from '@leasefy/cadence'
import { Badge, Button } from '@/components/ui'

import { useI18n } from '@/lib/i18n'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import {
  ACUERDO_ESTADO,
  ACUERDO_TIPO_LABEL,
  type AcuerdoEstado,
  type AcuerdoRow,
} from '@/lib/cobranza/acuerdo-vocab'

export type AcuerdoFiltro = 'todos' | AcuerdoEstado

const FILTRO_OPCIONES: { value: AcuerdoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'vigente', label: 'Vigentes' },
  { value: 'por_aprobar', label: 'Por aprobar' },
  { value: 'incumplido', label: 'Incumplidos' },
  { value: 'cumplido', label: 'Cumplidos' },
]

const VACIO = '—'

export interface AcuerdosTablaProps {
  acuerdos: AcuerdoRow[]
  filtro: AcuerdoFiltro
  onFiltro: (f: AcuerdoFiltro) => void
  /** Abre el detalle. Sin esto la tabla contesta «qué hay» y nada más. */
  onAbrir: (a: AcuerdoRow) => void
  /** Se dibuja una banda de error arriba de la tabla, sin tapar lo cargado. */
  error?: string | null
  onReintentar?: () => void
}

export function AcuerdosTabla({
  acuerdos,
  filtro,
  onFiltro,
  onAbrir,
  error,
  onReintentar,
}: AcuerdosTablaProps) {
  const { formatCurrency, formatDate } = useI18n()

  const visibles = useMemo(
    () => (filtro === 'todos' ? acuerdos : acuerdos.filter((a) => a.estado === filtro)),
    [acuerdos, filtro],
  )

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: filtro })

  const fecha = (iso: string | null) => {
    if (!iso) return VACIO
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? VACIO
      : formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <Card className="overflow-hidden">
      {/* Filtro excluyente + conteo */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border px-4 py-3">
        <SegmentedControl<AcuerdoFiltro>
          options={FILTRO_OPCIONES}
          value={filtro}
          onChange={onFiltro}
          aria-label="Filtrar acuerdos por estado"
        />
        <span className="text-xs text-fg-muted tabular-nums">
          {total} {total === 1 ? 'acuerdo' : 'acuerdos'}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 flex-wrap border-b border-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <span>No pudimos cargar los acuerdos. {error}</span>
          {onReintentar && (
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={onReintentar}
              className="shrink-0 px-0 h-auto text-sm text-danger underline hover:no-underline"
            >
              Reintentar
            </Button>
          )}
        </div>
      )}

      {visibles.length === 0 ? (
        /* El vacío vive DENTRO de la Card, no flotando en la pantalla. */
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Handshake
            className="w-7 h-7 text-fg-muted"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-fg">
            {filtro === 'todos'
              ? 'Todavía no hay acuerdos de pago'
              : 'Sin acuerdos en este estado'}
          </p>
          <p className="text-xs text-fg-muted max-w-sm">
            {filtro === 'todos'
              ? 'Acá aparece lo que cada deudor se comprometió a pagar: lo que el agente registra en una llamada y los planes de cuotas que armes.'
              : 'Cambiá el filtro para ver los demás.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deudor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Abrir detalle</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((a) => {
                const estado = ACUERDO_ESTADO[a.estado]
                return (
                  <TableRow
                    key={a.key}
                    data-testid={`acuerdo-${a.key}`}
                    onClick={() => onAbrir(a)}
                    // La fila entera abre el detalle. El `tabIndex` + Enter/Espacio
                    // están porque un `<tr>` clicable no es focusable por sí solo:
                    // sin esto, con teclado la tabla no se puede abrir.
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver el acuerdo de ${a.deudor}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onAbrir(a)
                      }
                    }}
                    className="cursor-pointer hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:bg-surface-muted"
                  >
                    <TableCell className="font-medium text-fg">{a.deudor}</TableCell>
                    <TableCell className="text-fg-muted">
                      {ACUERDO_TIPO_LABEL[a.tipo]}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-fg">
                      {formatCurrency(a.montoCop)}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-fg-muted">
                      {fecha(a.venceEl)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={estado.variant}>
                        {estado.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <CaretRight
                        className="w-4 h-4 text-fg-muted inline-block"
                        aria-hidden="true"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Un paginador que no pagina es ruido. */}
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
