'use client'

/**
 * Los casos en siniestro, aparte de la mora.
 *
 * A los `diasParaSiniestro` días de mora con saldo (30 por defecto, por
 * inmobiliaria) el back pasa el cobro a `DEFAULTED`: deja de ser cobranza y
 * es reclamación a la aseguradora. Por eso no se suma a los tramos por edad
 * — meterlo ahí infla la mora y esconde que el caso ya cambió de naturaleza.
 *
 * Dos piezas:
 *   - `TablaDeSiniestros`: la tabla de la casa con los casos. La usa
 *     `CarteraCompleta` dentro de su tarjeta (es un segmento más de la misma
 *     tabla: Por deuda · Por propietario · En siniestro).
 *   - `EnSiniestro`: la sección completa (franja con la regla + tabla), para
 *     quien la necesite sola. La franja se pinta SIEMPRE que el back mande
 *     `siniestros`, aunque venga vacío: la regla existe y la persona tiene
 *     que saber a los cuántos días aplica, no descubrirlo con el primer caso.
 */

import Link from 'next/link'
import { ArrowSquareOut, ShieldWarning } from '@phosphor-icons/react'

import { Badge } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SinDatos } from '@/components/estado/SinDatos'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type { CarteraSiniestro, CarteraSiniestros } from '@/lib/types/inmobiliaria'
import { nombreDelMes } from '@/lib/utils/mes'

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function fechaCorta(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : FECHA_CORTA.format(d)
}

export function reglaDeSiniestro(diasParaSiniestro: number): string {
  return `Un cobro pasa a siniestro a los ${diasParaSiniestro} días de mora con saldo; el plazo se cambia en la configuración de la inmobiliaria.`
}

export interface TablaDeSiniestrosProps {
  items: readonly CarteraSiniestro[]
  diasParaSiniestro: number
  /** ¿Hay búsqueda puesta? Distingue «ningún caso» de «ninguno coincide». */
  hayFiltros?: boolean
  onLimpiarFiltros?: () => void
}

const COLUMNAS = 7

export function TablaDeSiniestros({
  items,
  diasParaSiniestro,
  hayFiltros = false,
  onLimpiarFiltros,
}: TablaDeSiniestrosProps) {
  return (
    <Table data-testid="siniestros-tabla">
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Inquilino</TableHead>
          <TableHead className="whitespace-nowrap">Inmueble</TableHead>
          <TableHead className="whitespace-nowrap">Propietario</TableHead>
          <TableHead className="whitespace-nowrap">Período</TableHead>
          <TableHead className="whitespace-nowrap">En siniestro desde</TableHead>
          <TableHead className="whitespace-nowrap text-right">Saldo</TableHead>
          <TableHead className="w-16" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMNAS} className="p-0">
              <SinDatos
                hayFiltros={hayFiltros}
                queSon="casos en siniestro"
                icono={ShieldWarning}
                titulo="Ningún caso en siniestro"
                descripcion={reglaDeSiniestro(diasParaSiniestro)}
                onLimpiarFiltros={onLimpiarFiltros}
              />
            </TableCell>
          </TableRow>
        ) : (
          items.map((i) => {
            const desde = fechaCorta(i.siniestroAt)
            return (
              <TableRow key={i.cobroId} data-testid="siniestro-fila" data-cobro-id={i.cobroId}>
                <TableCell className="font-medium text-fg">
                  {i.tenantName ?? <span className="text-warning">Sin inquilino</span>}
                </TableCell>
                <TableCell className="text-fg-muted">
                  <span className="block max-w-[14rem] truncate">
                    {i.propertyAddress ?? i.propertyTitle}
                  </span>
                </TableCell>
                <TableCell className="text-fg-muted">
                  {i.propietarioName ?? <span className="text-warning">Sin consignar</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">{nombreDelMes(i.month)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    {/* Sin fecha se dice: un guion se lee como «vacío a propósito». */}
                    <span className="text-fg-muted">{desde ?? 'Sin fecha'}</span>
                    <Badge variant="destructive">
                      {i.diasEnSiniestro === 1 ? '1 día' : `${i.diasEnSiniestro} días`}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-mono font-medium tabular-nums text-fg">
                  {formatCurrency(i.pendingAmount)}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm" hideArrow>
                    <Link href={`/panel/inmobiliaria/cobros?cobro=${i.cobroId}`}>
                      <ArrowSquareOut className="h-4 w-4" />
                      <span className="sr-only">Ver el cobro</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}

export function EnSiniestro({ siniestros }: { siniestros: CarteraSiniestros }) {
  const { cantidad, totalCop, diasParaSiniestro, items } = siniestros

  return (
    <section aria-labelledby="en-siniestro" data-testid="en-siniestro" className="space-y-3">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p
            id="en-siniestro"
            className="flex items-center gap-1.5 text-xs text-fg-muted"
          >
            <ShieldWarning className="h-3.5 w-3.5" />
            En siniestro
          </p>
          <p
            className="text-2xl font-semibold tabular-nums text-danger"
            data-testid="siniestro-total"
          >
            {formatCurrency(totalCop)}
          </p>
          <p className="text-xs text-fg-muted" data-testid="siniestro-cantidad">
            {cantidad === 0
              ? 'Ningún caso'
              : `${cantidad} ${cantidad === 1 ? 'caso' : 'casos'}`}
          </p>
        </div>
        {/* La regla, dicha: sin esto el número aparece un día sin explicación. */}
        <p className="max-w-sm text-xs text-fg-muted" data-testid="siniestro-regla">
          {reglaDeSiniestro(diasParaSiniestro)}
        </p>
      </Card>

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <TablaDeSiniestros items={items} diasParaSiniestro={diasParaSiniestro} />
        </div>
      ) : null}
    </section>
  )
}
