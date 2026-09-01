'use client'

/**
 * Los casos en siniestro, aparte de la mora.
 *
 * A los `diasParaSiniestro` días de mora con saldo (30 por defecto, por
 * inmobiliaria) el back pasa el cobro a `DEFAULTED`: deja de ser cobranza y
 * es reclamación a la aseguradora. Por eso no se suma a los tramos por edad
 * — meterlo ahí infla la mora y esconde que el caso ya cambió de naturaleza.
 *
 * La sección se pinta SIEMPRE que el back mande `siniestros`, aunque venga
 * vacía: la regla existe y la persona tiene que saber a los cuántos días
 * aplica, no descubrirlo cuando el primer caso aparezca.
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
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type { CarteraSiniestros } from '@/lib/types/inmobiliaria'

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function fechaCorta(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : FECHA_CORTA.format(d)
}

export function EnSiniestro({ siniestros }: { siniestros: CarteraSiniestros }) {
  const { cantidad, totalCop, diasParaSiniestro, items } = siniestros

  return (
    <section aria-labelledby="en-siniestro" data-testid="en-siniestro" className="space-y-3">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p
            id="en-siniestro"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <ShieldWarning className="h-3.5 w-3.5" />
            En siniestro
          </p>
          <p
            className="text-2xl font-semibold tabular-nums text-destructive"
            data-testid="siniestro-total"
          >
            {formatCurrency(totalCop)}
          </p>
          <p className="text-xs text-muted-foreground" data-testid="siniestro-cantidad">
            {cantidad === 0
              ? 'Ningún caso'
              : `${cantidad} ${cantidad === 1 ? 'caso' : 'casos'}`}
          </p>
        </div>
        {/* La regla, dicha: sin esto el número aparece un día sin explicación. */}
        <p className="max-w-sm text-xs text-muted-foreground" data-testid="siniestro-regla">
          Un cobro pasa a siniestro a los {diasParaSiniestro} días de mora con
          saldo; el plazo se cambia en la configuración de la inmobiliaria.
        </p>
      </Card>

      {items.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inquilino</TableHead>
                  <TableHead>Inmueble</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead>En siniestro desde</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.cobroId} data-testid="siniestro-fila">
                    <TableCell className="font-medium text-foreground">
                      {i.tenantName ?? 'Sin nombre'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {i.propertyAddress ?? i.propertyTitle}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {i.propietarioName ?? (
                        <span className="text-warning">Sin consignar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {i.month}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(i.pendingAmount)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {fechaCorta(i.siniestroAt)}
                      </span>{' '}
                      <Badge variant="destructive">
                        {i.diasEnSiniestro === 1
                          ? '1 día'
                          : `${i.diasEnSiniestro} días`}
                      </Badge>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}
    </section>
  )
}
