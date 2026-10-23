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

import { useMemo, useState, type ReactNode } from 'react'
import { CaretRight, Handshake, MagnifyingGlass } from '@phosphor-icons/react'
import { Card, CrossFade, Presence } from '@leasefy/cadence'
import { Badge, Input } from '@/components/ui'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'

import { useI18n } from '@/lib/i18n'
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
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

// El orden es el del trabajo: lo que espera a una persona primero.
const FILTRO_OPCIONES: { value: AcuerdoFiltro; label: string; aviso?: boolean }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'por_aprobar', label: 'Por aprobar', aviso: true },
  { value: 'vigente', label: 'Vigentes' },
  { value: 'parcial', label: 'Parciales' },
  { value: 'incumplido', label: 'Incumplidos' },
  { value: 'cumplido', label: 'Cumplidos' },
]

const VACIO = '—'

export interface AcuerdosTablaProps {
  /**
   * LA RESPUESTA de la pantalla (la `CifraHeroe`), arriba de las pestañas y
   * DENTRO de la tarjeta, como «Deuda del mes» (revisora r25, C3).
   */
  cabeza?: ReactNode
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
  cabeza,
  acuerdos,
  filtro,
  onFiltro,
  onAbrir,
  error,
  onReintentar,
}: AcuerdosTablaProps) {
  const { formatCurrency, formatDate } = useI18n()

  // Revisora r25 (Acuerdos #6, 7a): se busca por el deudor, dentro de la tabla.
  const [busqueda, setBusqueda] = useState('')
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es')
    return acuerdos.filter(
      (a) =>
        (filtro === 'todos' || a.estado === filtro) &&
        (q === '' || a.deudor.toLocaleLowerCase('es').includes(q)),
    )
  }, [acuerdos, filtro, busqueda])

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: `${filtro}|${busqueda}` })

  // El conteo de cada pestaña sale de la lista entera (no de la página).
  const pestanas = useMemo(
    () =>
      FILTRO_OPCIONES.map((o) => ({
        valor: o.value,
        etiqueta: o.label,
        cuantos: o.value === 'todos' ? acuerdos.length : acuerdos.filter((a) => a.estado === o.value).length,
        fija: o.value === 'todos',
        tono: o.aviso ? ('aviso' as const) : undefined,
        testid: `acuerdos-pestana-${o.value}`,
      })),
    [acuerdos],
  )

  const fecha = (iso: string | null) => {
    if (!iso) return VACIO
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? VACIO
      : formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <Card className="overflow-hidden">
      {cabeza}
      {/* Las pestañas de estado, con su conteo, y el buscador, DENTRO de la tarjeta. */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <PestanasDeEstado<AcuerdoFiltro>
          pestanas={pestanas}
          valor={filtro}
          onCambio={onFiltro}
          etiqueta="Filtrar acuerdos por estado"
        />
        <div className="relative w-full md:w-64 md:shrink-0">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar deudor"
            aria-label="Buscar acuerdos por deudor"
            className="pl-9"
            data-testid="acuerdos-buscar"
          />
        </div>
      </div>

      {/* C5 (r25): FalloDeCarga, nunca el error crudo pegado a la frase. */}
      <Presence show={Boolean(error)} className="border-b border-border">
        <FalloDeCarga error={falloDelTexto(error)} queEs="los acuerdos" onReintentar={onReintentar} enmarcado={false} />
      </Presence>

      {/* Filtrado a cero ⇄ con acuerdos: el uno sale y el otro entra. */}
      <CrossFade swapKey={visibles.length === 0 ? 'vacio' : 'tabla'}>
      {visibles.length === 0 ? (
        /* El vacío vive DENTRO de la Card, no flotando en la pantalla. */
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Handshake
            className="w-7 h-7 text-fg-muted"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-body-sm font-medium text-fg">
            {busqueda.trim() !== ''
              ? 'Ningún acuerdo con esa búsqueda'
              : filtro === 'todos'
                ? 'Todavía no hay acuerdos de pago'
                : 'Sin acuerdos en este estado'}
          </p>
          <p className="text-caption text-fg-muted max-w-sm">
            {busqueda.trim() !== ''
              ? 'Borra la búsqueda o cambia la pestaña para ver los demás.'
              : filtro === 'todos'
                ? 'Aquí aparece lo que cada deudor se comprometió a pagar: lo que el agente registra en una llamada y los planes de cuotas que armes.'
                : 'Cambia la pestaña para ver los demás.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-md:overflow-visible">
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
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
            {/* Filtrar o paginar: las filas entran escalonadas (techo 320 ms) y las que sobran salen. */}
            <TableBodyAnimado className="max-md:block">
              {pageItems.map((a) => {
                const estado = ACUERDO_ESTADO[a.estado]
                return (
                  <TableRowAnimada
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
                    className="cursor-pointer hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:bg-surface-muted max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                  >
                    <TableCell className="font-medium text-fg max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">{a.deudor}</TableCell>
                    <TableCell className="text-fg-muted max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption">
                      {ACUERDO_TIPO_LABEL[a.tipo]}
                      <span className="md:hidden"> · vence {fecha(a.venceEl)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-fg max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                      {formatCurrency(a.montoCop)}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-fg-muted max-md:hidden">
                      {fecha(a.venceEl)}
                    </TableCell>
                    <TableCell className="max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                      <Badge variant={estado.variant}>
                        {estado.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right max-md:hidden">
                      <CaretRight
                        className="w-4 h-4 text-fg-muted inline-block"
                        aria-hidden="true"
                      />
                    </TableCell>
                  </TableRowAnimada>
                )
              })}
            </TableBodyAnimado>
          </Table>
        </div>
      )}
      </CrossFade>

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
