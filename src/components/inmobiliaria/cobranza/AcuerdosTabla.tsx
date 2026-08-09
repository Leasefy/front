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
import { Handshake } from '@phosphor-icons/react'
import { Badge, Card, SegmentedControl } from '@leasefy/cadence'

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
  /** Se dibuja una banda de error arriba de la tabla, sin tapar lo cargado. */
  error?: string | null
  onReintentar?: () => void
}

export function AcuerdosTabla({
  acuerdos,
  filtro,
  onFiltro,
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
            <button
              type="button"
              onClick={onReintentar}
              className="shrink-0 underline underline-offset-2 hover:no-underline"
            >
              Reintentar
            </button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((a) => {
                const estado = ACUERDO_ESTADO[a.estado]
                return (
                  <TableRow key={a.key} data-testid={`acuerdo-${a.key}`}>
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
                      <Badge variant={estado.variant} size="sm">
                        {estado.label}
                      </Badge>
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
