'use client'

/**
 * Los cobros que este contrato ha generado: el estado de cuenta del inquilino.
 *
 * Cada fila es un período; abierta, muestra el desglose línea por línea —el
 * canon, la administración, los conceptos del contrato, el IVA y las
 * retenciones, la mora— y los recibos con que se abonó. Esa lista de líneas
 * ES lo que se le cobra al inquilino: la cuenta de cobro imprimible es el
 * mismo cobro, en hoja.
 *
 * Un contrato sin inmueble no genera cobros (el cobro cuelga de la
 * consignación del inmueble), y eso se dice acá con el camino para
 * resolverlo, no con una tabla vacía.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowSquareOut,
  CaretDown,
  CaretRight,
  Printer,
  Receipt,
} from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TablePagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { DesgloseAdeudado } from '@/components/inmobiliaria/DesgloseAdeudado'
import { RecibosDeCajaHistorial } from '@/components/inmobiliaria/RecibosDeCajaHistorial'
import { contractsApi } from '@/lib/api/contracts.service'
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types'
import type { CobroStatus } from '@/lib/types/inmobiliaria'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { nombreDelMes } from '@/lib/utils/mes'
import { cn } from '@/lib/utils'
import type { Contract } from '@/lib/types/contract'

export interface ResumenDeCobros {
  total: number
  saldo: number
  enMora: number
  pendientes: number
}

interface Props {
  contract: Contract
  /** Para el resumen de arriba: cuántos períodos, cuánto se debe, cuántos en mora. */
  onResumen?: (r: ResumenDeCobros) => void
}

const ESTADO: Record<CobroStatus, { etiqueta: string; variante: 'warning' | 'success' | 'default' | 'destructive' }> = {
  pending: { etiqueta: 'Pendiente', variante: 'warning' },
  paid: { etiqueta: 'Pagado', variante: 'success' },
  partial: { etiqueta: 'Abono parcial', variante: 'default' },
  late: { etiqueta: 'En mora', variante: 'destructive' },
  defaulted: { etiqueta: 'Siniestro', variante: 'destructive' },
}

export function CobrosDelContrato({ contract, onResumen }: Props) {
  const [cobros, setCobros] = useState<CobroConDesglose[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    setCobros(null)
    try {
      const lista = await contractsApi.cobros(contract.id)
      setCobros(lista)
    } catch (e) {
      // Un fallo NO se pinta como «no tiene cobros»: son cosas distintas.
      setError(e instanceof Error ? e.message : 'No pudimos traer los cobros.')
      setCobros([])
    }
  }, [contract.id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const resumen = useMemo<ResumenDeCobros>(() => {
    const lista = cobros ?? []
    const saldo = lista.reduce((s, c) => s + (c.pendingAmount ?? 0), 0)
    const enMora = lista.filter((c) => c.status === 'late' || c.status === 'defaulted').length
    const pendientes = lista.filter((c) => (c.pendingAmount ?? 0) > 0).length
    return { total: lista.length, saldo, enMora, pendientes }
  }, [cobros])

  useEffect(() => {
    if (cobros !== null) onResumen?.(resumen)
  }, [cobros, resumen, onResumen])

  // Paginación — un período por mes: a los dos años de contrato son 24 filas,
  // y cada una se despliega. El resumen del encabezado sigue contando TODOS
  // los períodos (`resumen.total`), no los de la página.
  const {
    pageItems,
    total: totalDeCobros,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(cobros ?? [])

  const volverA = `/panel/inmobiliaria/contratos/${contract.id}`

  return (
    <section
      className="rounded-lg border border-border bg-card"
      data-testid="cobros-del-contrato"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Cobros</h3>
          {cobros && cobros.length > 0 ? (
            <span className="text-sm text-muted-foreground" data-testid="cobros-resumen">
              · {resumen.total} {resumen.total === 1 ? 'período' : 'períodos'}
              {resumen.enMora > 0 ? ` · ${resumen.enMora} en mora` : ''}
              {resumen.saldo > 0 ? ` · saldo ${formatCurrency(resumen.saldo)}` : ' · al día'}
            </span>
          ) : null}
        </div>
        <Button asChild variant="ghost" size="sm" hideArrow>
          <Link href="/panel/inmobiliaria/cobros">
            Ir a Cobros
            <ArrowSquareOut className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {cobros === null ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="sm" variant="muted" />
        </div>
      ) : error ? (
        <div className="space-y-2 px-5 py-6 text-sm">
          <p className="text-destructive">{error}</p>
          <Button variant="secondary" size="sm" hideArrow onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      ) : cobros.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground" data-testid="cobros-vacio">
          {contract.propertyId === null
            ? 'Sin inmueble vinculado no hay cobros: el cobro sale de la consignación del inmueble. Vinculalo en la tarjeta Propiedad.'
            : 'Todavía no se generó ningún cobro para este contrato. Los cobros se generan desde Cobros, mes a mes; cuando salga el primero, aparece acá con su desglose.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Período</th>
                <th className="px-3 py-2.5 font-medium">Vence</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-3 py-2.5 text-right font-medium">Pagado</th>
                <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => {
                const estaAbierto = abierto === c.id
                const estado = ESTADO[c.status] ?? { etiqueta: c.status, variante: 'default' as const }
                return (
                  <FilaDeCobro
                    key={c.id}
                    cobro={c}
                    estado={estado}
                    abierto={estaAbierto}
                    volverA={volverA}
                    onToggle={() => setAbierto(estaAbierto ? null : c.id)}
                  />
                )
              })}
            </tbody>
          </table>

          {/* Pie de tabla del design system: cuántos períodos hay en total y
              cuántos se ven. */}
          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={totalDeCobros}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function FilaDeCobro({
  cobro,
  estado,
  abierto,
  volverA,
  onToggle,
}: {
  cobro: CobroConDesglose
  estado: { etiqueta: string; variante: 'warning' | 'success' | 'default' | 'destructive' }
  abierto: boolean
  volverA: string
  onToggle: () => void
}) {
  const periodo = capitalizar(nombreDelMes(cobro.month))
  const vence = fechaCorta(cobro.dueDate)
  const cuentaDeCobro = `/panel/inmobiliaria/cobros/${cobro.id}/cuenta-de-cobro?volver=${encodeURIComponent(volverA)}`

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer border-b border-border transition-colors hover:bg-muted/40',
          abierto && 'bg-muted/30',
        )}
        onClick={onToggle}
        data-testid={`cobro-${cobro.month}`}
        aria-expanded={abierto}
      >
        <td className="whitespace-nowrap px-5 py-3 font-medium text-foreground">{periodo}</td>
        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">{vence}</td>
        <td className="px-3 py-3 text-right tabular-nums text-foreground">
          {formatCurrency(cobro.totalWithFees)}
        </td>
        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
          {formatCurrency(cobro.paidAmount)}
        </td>
        <td
          className={cn(
            'px-3 py-3 text-right tabular-nums',
            cobro.pendingAmount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          {formatCurrency(cobro.pendingAmount)}
        </td>
        <td className="px-3 py-3">
          <Badge variant={estado.variante}>{estado.etiqueta}</Badge>
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {abierto ? <CaretDown className="h-4 w-4" /> : <CaretRight className="h-4 w-4" />}
        </td>
      </tr>
      {abierto ? (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={7} className="px-5 py-4">
            {/* `width: 0; min-width: 100%`: el detalle ocupa el ancho de la
                tabla sin ENSANCHARLA — si no, el desglose y los recibos
                empujan las columnas y la tabla se sale de la tarjeta. */}
            <div style={{ width: 0, minWidth: '100%' }}>
              <div className="grid gap-5 xl:grid-cols-2">
                <DesgloseAdeudado
                  cobro={cobro}
                  conceptos={cobro.conceptos ?? []}
                  sinEstadoDePago
                  className="min-w-0"
                />
                <RecibosDeCajaHistorial recibos={cobro.recibosDeCaja ?? []} className="min-w-0" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm" hideArrow>
                  <Link href={cuentaDeCobro} data-testid={`cuenta-de-cobro-${cobro.month}`}>
                    <Printer className="mr-1 h-3.5 w-3.5" />
                    Cuenta de cobro
                  </Link>
                </Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function capitalizar(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

/**
 * «5 oct 2026». Lee el día de la parte `YYYY-MM-DD` del ISO, sin pasar por
 * `new Date(iso)`: `dueDate` es un DATE que viaja como medianoche UTC, y en
 * Bogotá esa medianoche todavía es el día anterior — el cobro del 5 se
 * mostraba venciendo el 4. Sin «de», que en una celda angosta parte la fecha
 * en cuatro líneas.
 */
function fechaCorta(iso: string | null | undefined): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!partes) return '—'
  const d = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
  return d
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/ de /g, ' ')
    .replace(/\.$/, '')
}
