'use client';

/**
 * Recaudo — cuánto llegó, cuánto falta, cuánto salió y cuánto queda en la
 * mano, mes por mes.
 *
 * Antes esto estaba repartido: `/cobros` muestra el mes corriente, `/cartera`
 * la deuda por edad, `/dispersiones` lo que sale y `/tesoreria` explica el
 * neto con un ejemplo. Acá están las cuatro cifras juntas, y debajo de cada
 * una está escrito de qué se compone — la definición vive en el back
 * (`recaudo.service.ts`) y esta pantalla la repite, no la reinterpreta.
 *
 * Lo que la pantalla se niega a hacer:
 *   - Mostrar un mes futuro. No hay nada que ver ahí.
 *   - Confundir «no llegó nada» con «no pudimos preguntar».
 *   - Recortar un «disponible» negativo: si se giró plata que nunca pasó
 *     por un recibo, el número lo dice.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CaretLeft, CaretRight, Coins } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import type { ResumenDeRecaudo } from '@/lib/api/recaudo.types';
import { formatCurrency } from '@/lib/format';
import { useRecaudo } from '@/lib/hooks/use-recaudo';
import { esFuturo, mesActual, nombreDelMes, sumarMeses } from '@/lib/recaudo/meses';

/** «septiembre de 2026» → «Septiembre de 2026». `capitalize` de CSS ponía «De» en mayúscula. */
function conMayusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
import { cn } from '@/lib/utils';
import { GraficoDeRecaudo } from './GraficoDeRecaudo';

const NOMBRE_DEL_MEDIO: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  PSE: 'PSE',
  CHEQUE: 'Cheque',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  TARJETA: 'Tarjeta',
  WOMPI: 'Wompi',
  CONCILIACION: 'Conciliación de saldo anterior',
};

function nombreDelMedio(medio: string): string {
  return NOMBRE_DEL_MEDIO[medio] ?? medio;
}

/** «No hay nada que contar» sólo cuando de verdad no hubo nada en el mes. */
export function mesSinMovimiento(r: ResumenDeRecaudo): boolean {
  return (
    r.facturadoCop === 0 &&
    r.recaudadoCop === 0 &&
    r.dispersadoCop === 0 &&
    r.cobrosPagados + r.cobrosPendientes + r.cobrosEnMora === 0
  );
}

export function Recaudo() {
  const [month, setMonth] = useState(() => mesActual());
  const { resumen, serie, cargando, error, recargar } = useRecaudo(month);

  const siguiente = sumarMeses(month, 1);
  const puedeAvanzar = !esFuturo(siguiente);

  return (
    <div className="space-y-6">
      {/* ── El mes ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" data-testid="selector-de-mes">
          <Button
            variant="secondary"
            size="sm"
            hideArrow
            aria-label="Mes anterior"
            onClick={() => setMonth(sumarMeses(month, -1))}
          >
            <CaretLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <p className="min-w-[11rem] text-center font-mono text-sm tabular-nums" data-testid="mes-en-foco">
            {conMayusculaInicial(nombreDelMes(month))}
          </p>
          <Button
            variant="secondary"
            size="sm"
            hideArrow
            aria-label="Mes siguiente"
            disabled={!puedeAvanzar}
            onClick={() => puedeAvanzar && setMonth(siguiente)}
          >
            <CaretRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/cobros">Ver cobros del mes</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/cobros/cartera">Ver cartera</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/dispersiones/lotes">
              Lotes al banco
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Cargando / falló / vacío / cifras ─────────────────────────── */}
      {cargando && !resumen ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <FalloDeCarga error={error} queEs="el recaudo" onReintentar={recargar} />
      ) : !resumen ? null : mesSinMovimiento(resumen) ? (
        <EmptyState
          icon={Coins}
          title={`Nada que contar en ${nombreDelMes(month)}`}
          description="No hubo cobros, recibos ni giros con fecha en este mes. Si la plata entró, se registra con un recibo de caja desde Cobros."
          action={{ label: 'Ir a cobros', href: '/panel/inmobiliaria/cobros' }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="cifras">
            <Cifra
              id="llego"
              etiqueta="Llegó"
              valor={resumen.recaudadoCop}
              definicion={`Recibos de caja con fecha en el mes. ${formatCurrency(resumen.recaudadoDelMesCop)} son de cobros de este mes; el resto, de meses anteriores.`}
            />
            <Cifra
              id="pendiente"
              etiqueta="Pendiente"
              valor={resumen.pendienteCop}
              tono={resumen.pendienteCop > 0 ? 'warning' : undefined}
              definicion={`Saldo de los ${resumen.cobrosPendientes + resumen.cobrosEnMora} cobros del mes sin pagar. En mora acumulada, con meses anteriores: ${formatCurrency(resumen.enMoraCop)}.`}
            />
            <Cifra
              id="dispersado"
              etiqueta="Dispersado"
              valor={resumen.dispersadoCop}
              definicion={`Lotes pagados y giros uno a uno con fecha en el mes. La inmobiliaria se quedó ${formatCurrency(resumen.comisionesCop)} de comisión.`}
            />
            <Cifra
              id="disponible"
              etiqueta="Disponible"
              valor={resumen.disponibleCop}
              tono={resumen.disponibleCop < 0 ? 'danger' : undefined}
              definicion={
                resumen.disponibleCop < 0
                  ? 'Recaudado menos dispersado y comisiones, acumulado al cierre del mes. Negativo: se giró plata que nunca pasó por un recibo de caja.'
                  : 'Recaudado menos dispersado y comisiones, acumulado al cierre del mes: lo que hay en la mano y es de terceros.'
              }
            />
          </div>

          <p className="font-mono text-xs text-fg-muted" data-testid="facturado">
            Facturado {formatCurrency(resumen.facturadoCop)} · {resumen.cobrosPagados} pagados ·{' '}
            {resumen.cobrosPendientes} pendientes · {resumen.cobrosEnMora} en mora
          </p>

          <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <header className="space-y-1">
              <h2 className="text-h2">Últimos doce meses</h2>
              <p className="text-body-sm text-fg-muted">
                Lo que se pidió, lo que llegó y lo que salió, mes por mes hasta {nombreDelMes(month)}.
              </p>
            </header>
            {serie && serie.length > 0 ? (
              <GraficoDeRecaudo serie={serie} />
            ) : (
              <p className="text-body-sm text-fg-muted">Todavía no hay serie para graficar.</p>
            )}
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <header className="space-y-1">
              <h2 className="text-h2">Por medio de pago</h2>
              <p className="text-body-sm text-fg-muted">Cómo entró la plata del mes, según el recibo.</p>
            </header>
            {resumen.porMedio.length === 0 ? (
              <p className="text-body-sm text-fg-muted" data-testid="sin-recibos">
                Ningún recibo de caja con fecha en el mes.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="por-medio">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medio</TableHead>
                      <TableHead className="text-right">Recibos</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.porMedio.map((m) => (
                      <TableRow key={m.medio}>
                        <TableCell>{nombreDelMedio(m.medio)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{m.cantidad}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(m.valorCop)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Cifra({
  id,
  etiqueta,
  valor,
  definicion,
  tono,
}: {
  id: string;
  etiqueta: string;
  valor: number;
  definicion: string;
  tono?: 'warning' | 'danger';
}) {
  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-surface p-5 shadow-sm"
      data-testid={`cifra-${id}`}
    >
      <p className="text-label text-fg-muted">{etiqueta}</p>
      <p
        className={cn(
          'font-mono text-2xl font-medium tabular-nums text-fg',
          tono === 'warning' && 'text-warning',
          tono === 'danger' && 'text-danger',
        )}
        data-testid={`valor-${id}`}
      >
        {formatCurrency(valor)}
      </p>
      <p className="text-xs leading-relaxed text-fg-muted">{definicion}</p>
    </section>
  );
}
