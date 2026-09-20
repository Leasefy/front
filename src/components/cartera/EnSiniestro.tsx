'use client'

/**
 * Los casos en siniestro, aparte de la cartera viva.
 *
 * A los `diasParaSiniestro` días de mora con saldo (30 por defecto, por
 * inmobiliaria) el caso deja de ser cobranza y es reclamación a la
 * aseguradora. Por eso no se suma a los tramos por edad — meterlo ahí infla la
 * cartera viva y esconde que el caso ya cambió de naturaleza.
 *
 * 🔴 2026-09-16: el siniestro se DEDUCE de los días de mora de la CUOTA, no de
 * un `Cobro` en `DEFAULTED`. Leer el estado del cobro daba cero siniestros en
 * la inmobiliaria migrada, que no tiene un solo cobro y sí 373 cuotas en
 * cartera. Y «mora» son los días DESPUÉS del plazo del contrato: el umbral se
 * cuenta desde ahí, no desde el vencimiento.
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
import { aDondeLleva } from '@/components/cartera/CarteraTable'
import type { CarteraSiniestro, CarteraSiniestros } from '@/lib/types/inmobiliaria'
import { nombreDelMes } from '@/lib/utils/mes'
import { CLAVE_DE_MORA, interesPendiente } from '@/components/cartera/interes-de-mora'
import { useI18n } from '@/lib/i18n'

/**
 * 🔴 `timeZone: 'UTC'` no es un detalle: `siniestroDesde` viaja como
 * `'YYYY-MM-DD'`, que JavaScript parsea a medianoche UTC. Formateado en la
 * zona local, en Bogotá (UTC−5) eso son las 7 p. m. del día ANTERIOR, y la
 * fecha se renderiza corrida un día. Es el mismo defecto que ya cazamos en
 * `consignedAt`.
 */
const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function fechaCorta(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : FECHA_CORTA.format(d)
}

export function reglaDeSiniestro(diasParaSiniestro: number): string {
  return `Una deuda pasa a siniestro a los ${diasParaSiniestro} días de mora con saldo —contados DESPUÉS de los días de plazo del contrato—; el umbral se cambia en la configuración de la inmobiliaria.`
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
  const { t } = useI18n()
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
            const desde = fechaCorta(i.siniestroDesde)
            return (
              <TableRow
                key={i.cuotaId}
                data-testid="siniestro-fila"
                data-cuota-id={i.cuotaId}
              >
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
                  {/* El interés de la reclamación, aparte del capital. */}
                  {interesPendiente(i) > 0 ? (
                    <div
                      className="text-xs font-normal text-danger"
                      data-testid="siniestro-intereses"
                    >
                      {t(CLAVE_DE_MORA.masIntereses, { monto: formatCurrency(interesPendiente(i)) })}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm" hideArrow>
                    {/* Sin cobro emitido se abre el contrato: la deuda nace ahí. */}
                    <Link href={aDondeLleva(i)}>
                      <ArrowSquareOut className="h-4 w-4" />
                      <span className="sr-only">
                        {i.cobroId ? 'Ver el cobro' : 'Ver el contrato'}
                      </span>
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
