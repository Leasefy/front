'use client'

/**
 * CuotasDelMesTabla — las CUOTAS de un mes en LA tabla de la casa.
 *
 * Reemplaza a `CobrosDelMesTabla`, que listaba `Cobro`. El cambio no es de
 * columnas: es de unidad. Nico (2026-09-16), mirando la pantalla vacía sobre
 * 30.951 cuotas: «el cobro ya está generado, porque en el estado de cuenta el
 * usuario debe pagar en varias etapas […] no es que le dé cobrar para poder
 * que paguen». Un `Cobro` es el DOCUMENTO con el que finanzas reclama; la
 * deuda vive en la cuota del contrato y existe desde la firma. Listar cobros
 * dejaba la tabla en cero en la inmobiliaria migrada, que tiene cero.
 *
 * Las primitivas son las mismas que Agenda, Inquilinos y el resto del panel:
 * `Table` + `useTablePagination` + `TablePagination`, sin título encima («no
 * nombramos las tablas»), y con el vacío DENTRO del `<TableBody>` para que los
 * encabezados se sigan viendo.
 *
 * 🔴 La columna «Estado» dice EN QUÉ CAJÓN está la cuota, con las mismas
 * palabras que «Cartera por concepto» (`CarteraPorConcepto.tsx`): por vencer ·
 * vencido, en plazo · cartera. Pintar «vencido dentro del plazo» igual que
 * «cartera» es cómo se termina llamando a alguien que está usando el plazo que
 * la inmobiliaria misma le dio, con la Ley 2300 de por medio.
 *
 * Sólo pinta. Cargando y fallo los resuelve `EstadoDeDatos` en el panel.
 */

import { CurrencyCircleDollar } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { SinDatos } from '@/components/estado/SinDatos'
import { useTablePagination } from '@/lib/hooks/use-table-pagination'
import { rotuloDelContrato } from '@/lib/cartera/conceptos'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { nombreDelMes } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'
import type { CajonDeLaCuota, FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'
import { cn } from '@/lib/utils'

/**
 * Cómo se lee cada cajón. Las palabras son las de la pantalla de cartera, no
 * unas nuevas: el mismo hecho tiene que llamarse igual en las dos.
 */
export const NOMBRE_DEL_CAJON: Record<CajonDeLaCuota, string> = {
  CARTERA: 'Cartera',
  VENCIDA_EN_PLAZO: 'Vencido, en plazo',
  POR_VENCER: 'Por vencer',
  SIN_DEUDA: 'Pagada',
}

const VARIANTE_DEL_CAJON: Record<
  CajonDeLaCuota,
  'destructive' | 'warning' | 'secondary' | 'success'
> = {
  CARTERA: 'destructive',
  VENCIDA_EN_PLAZO: 'warning',
  POR_VENCER: 'secondary',
  SIN_DEUDA: 'success',
}

/**
 * `vence` llega como 'YYYY-MM-DD' (el back ya lo recortó del `@db.Date`).
 * Se construye en hora LOCAL a partir de sus tres componentes: pasarlo por
 * `new Date(iso)` y formatearlo en Colombia (UTC-5) lo corre al día anterior.
 */
export function fechaLocal(iso: string, locale: 'es' | 'en'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export interface CuotasDelMesTablaProps {
  /** TODAS las filas a mostrar; la tabla pagina sola. */
  filas: readonly FilaDeLaCuotaDelMes[]
  /** 'YYYY-MM'. Cambiar de mes (o de filtro) vuelve a la página 1. */
  mes: string
  /** ¿Hay búsqueda o interruptor puestos? Distingue los dos vacíos. */
  hayFiltros?: boolean
  onLimpiarFiltros?: () => void
}

const COLUMNAS = 6

export function CuotasDelMesTabla({
  filas,
  mes,
  hayFiltros = false,
  onLimpiarFiltros,
}: CuotasDelMesTablaProps) {
  const { locale } = useI18n()
  const idioma = locale === 'es' ? 'es' : 'en'

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filas, { initialPageSize: 10, resetKey: `${mes}|${hayFiltros}` })

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-surface"
      data-testid="pagos-cuotas-tabla"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Inquilino</TableHead>
            <TableHead className="whitespace-nowrap">Inmueble</TableHead>
            <TableHead className="whitespace-nowrap">Período</TableHead>
            <TableHead className="whitespace-nowrap" numeric>
              Se debe
            </TableHead>
            <TableHead className="whitespace-nowrap" numeric>
              Pagado / falta
            </TableHead>
            <TableHead className="whitespace-nowrap">Vence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                {/*
                  🔴 El vacío NO puede decir «todavía no hay cobros»: con
                  contratos vigentes SÍ hay deuda. Un mes sin ninguna cuota es
                  un mes que nadie generó, y eso es lo que se dice.
                */}
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon="cuotas"
                  icono={CurrencyCircleDollar}
                  titulo="Ningún contrato tiene cuota de este mes"
                  descripcion="La deuda nace con el contrato: si no hay ni una cuota, es que todavía no se generó la tabla de amortización de ningún contrato vigente."
                  onLimpiarFiltros={hayFiltros ? onLimpiarFiltros : undefined}
                />
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((f) => (
              <TableRow key={f.cuotaId} data-testid="cuota-fila">
                <TableCell>
                  <p className="truncate font-medium text-fg">
                    {f.inquilino ?? 'Sin nombre en el contrato'}
                  </p>
                  <p className="truncate text-caption text-fg-muted">
                    {f.documento ? `CC ${f.documento}` : ''}
                    {f.contrato ? rotuloDelContrato(f) : ''}
                  </p>
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <p className="truncate text-fg">{f.inmueble}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  {nombreDelMes(f.month, idioma, 'short')}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums" numeric>
                  <span className="font-medium text-fg">{formatCurrency(f.totalCop)}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums" numeric>
                  <span
                    className={cn(
                      'font-medium',
                      f.pagadoCop > 0 ? 'text-success' : 'text-fg-muted',
                    )}
                  >
                    {formatCurrency(f.pagadoCop)}
                  </span>
                  <p
                    className={cn(
                      'text-caption',
                      f.enMora ? 'text-danger' : 'text-fg-muted',
                    )}
                  >
                    {formatCurrency(f.pendienteCop)}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="block tabular-nums text-fg-muted">
                    {fechaLocal(f.vence, idioma)}
                  </span>
                  {/*
                    El cajón, con su matiz: la cartera dice cuántos días lleva
                    y lo vencido en plazo dice cuántos días le quedan. Son dos
                    hechos distintos y se escriben distinto.
                  */}
                  <Badge variant={VARIANTE_DEL_CAJON[f.cajon]} className="mt-1">
                    {f.enSiniestro ? 'En siniestro' : NOMBRE_DEL_CAJON[f.cajon]}
                  </Badge>
                  {f.cajon === 'CARTERA' && (
                    <p className="text-caption text-danger">
                      {f.diasDeMora} {f.diasDeMora === 1 ? 'día' : 'días'} de mora
                    </p>
                  )}
                  {f.cajon === 'VENCIDA_EN_PLAZO' && (
                    <p className="text-caption text-fg-muted">
                      plazo de {f.diasDePlazo} {f.diasDePlazo === 1 ? 'día' : 'días'}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3" data-testid="pagos-cuotas-pie">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}
