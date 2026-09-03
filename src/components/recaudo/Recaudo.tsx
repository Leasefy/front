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
 * ── Las listas son LA tabla de la casa (Nico, 2026-09-03) ───────────────────
 * «Esto no tiene las tablas de como lo manejamos nosotros.» Lo que el back
 * manda como lista —los doce meses de la serie y los recibos del mes por
 * medio de pago— se pinta con `Table` de `@/components/ui/table` dentro de
 * la tarjeta estándar, sin título encima (no se nombran las tablas), con el
 * vacío adentro del `<TableBody>` y carga/fallo por `EstadoDeDatos`.
 *
 * El endpoint (`GET /inmobiliaria/recaudo/{resumen,serie}`) devuelve
 * agregados: no hay una lista recibo por recibo ni giro por giro del mes.
 * Esa lista vive en `/cobros` (recibos) y en `/pagos/dispersiones` (giros).
 *
 * Lo que la pantalla se niega a hacer:
 *   - Mostrar un mes futuro. No hay nada que ver ahí.
 *   - Confundir «no llegó nada» con «no pudimos preguntar».
 *   - Recortar un «disponible» negativo: si se giró plata que nunca pasó
 *     por un recibo, el número lo dice.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CaretLeft, CaretRight, Coins, Receipt } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import type { PuntoDeLaSerie, ResumenDeRecaudo } from '@/lib/api/recaudo.types';
import { formatCurrency } from '@/lib/format';
import { useRecaudo } from '@/lib/hooks/use-recaudo';
import { esFuturo, mesActual, nombreDelMes, sumarMeses } from '@/lib/recaudo/meses';
import { cn } from '@/lib/utils';
import { GraficoDeRecaudo } from './GraficoDeRecaudo';

/** «septiembre de 2026» → «Septiembre de 2026». `capitalize` de CSS ponía «De» en mayúscula. */
function conMayusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

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

/**
 * Qué parte de lo facturado llegó, en entero. `null` cuando no se facturó
 * nada: un 0 % sobre $0 afirma que no se cobró, y no había nada que cobrar.
 */
export function porcentajeRecaudado(p: Pick<PuntoDeLaSerie, 'facturadoCop' | 'recaudadoCop'>): number | null {
  if (p.facturadoCop <= 0) return null;
  return Math.round((p.recaudadoCop / p.facturadoCop) * 100);
}

/** La serie para la tabla: el mes más reciente arriba, que es el que se mira. */
export function serieParaLaTabla(serie: readonly PuntoDeLaSerie[]): PuntoDeLaSerie[] {
  return [...serie].sort((a, b) => b.month.localeCompare(a.month));
}

export function Recaudo() {
  const [month, setMonth] = useState(() => mesActual());
  const { resumen, serie, cargando, error, recargar } = useRecaudo(month);

  const siguiente = sumarMeses(month, 1);
  const puedeAvanzar = !esFuturo(siguiente);

  const puntos = useMemo(() => serieParaLaTabla(serie ?? []), [serie]);
  const totalDeRecibos = useMemo(
    () =>
      (resumen?.porMedio ?? []).reduce(
        (acc, m) => ({ cantidad: acc.cantidad + m.cantidad, valorCop: acc.valorCop + m.valorCop }),
        { cantidad: 0, valorCop: 0 },
      ),
    [resumen],
  );

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

      {/* ── Cargando → falló → vacío → cifras, en ese orden ───────────────
          `cargando && !resumen` deja pasar el refresco de fondo (cambiar de
          mes) sin blanquear lo que ya se está viendo. */}
      <EstadoDeDatos
        cargando={cargando && !resumen}
        error={error}
        queEs="el recaudo"
        onReintentar={() => void recargar()}
        esqueleto={
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        }
      >
        {!resumen ? null : mesSinMovimiento(resumen) ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <SinDatos
              queSon="movimientos"
              icono={Coins}
              titulo={`Nada que contar en ${nombreDelMes(month)}`}
              descripcion="No hubo cobros, recibos ni giros con fecha en este mes. Si la plata entró, se registra con un recibo de caja desde Cobros."
              accion={
                <Button asChild hideArrow>
                  <Link href="/panel/inmobiliaria/cobros">Ir a cobros</Link>
                </Button>
              }
            />
          </div>
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

            {/* El gráfico sí lleva su nombre: es un gráfico, no una tabla. */}
            <section
              className="space-y-4 rounded-lg border border-border bg-surface p-6"
              aria-labelledby="ultimos-doce-meses"
            >
              <div className="space-y-1">
                <h2 id="ultimos-doce-meses" className="text-sm font-semibold text-fg">
                  Últimos doce meses
                </h2>
                <p className="text-xs text-fg-muted">
                  Lo que se pidió, lo que llegó y lo que salió, mes por mes hasta {nombreDelMes(month)}.
                </p>
              </div>
              {puntos.length > 0 ? (
                <GraficoDeRecaudo serie={serie ?? []} />
              ) : (
                <p className="text-body-sm text-fg-muted">Todavía no hay serie para graficar.</p>
              )}
            </section>

            {/* Los mismos doce meses, en la tabla de la casa. La fila del mes
                en foco va marcada y cualquier fila cambia el mes: es el
                selector de arriba, pero con los números a la vista. */}
            <section className="overflow-hidden rounded-lg border border-border bg-surface">
              <Table data-testid="serie-mensual">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Mes</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Facturado</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Recaudado</TableHead>
                    <TableHead className="whitespace-nowrap text-right">% recaudado</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Dispersado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {puntos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <SinDatos
                          queSon="meses con movimiento"
                          icono={Coins}
                          titulo="Todavía no hay serie"
                          descripcion="Cuando haya cobros, recibos o giros en algún mes, aparece acá."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    puntos.map((p) => {
                      const enFoco = p.month === month;
                      const pct = porcentajeRecaudado(p);
                      return (
                        <TableRow
                          key={p.month}
                          onClick={() => setMonth(p.month)}
                          aria-current={enFoco ? 'true' : undefined}
                          className={cn('cursor-pointer', enFoco && 'bg-surface-muted')}
                          data-testid="serie-fila"
                          data-mes={p.month}
                        >
                          <TableCell className={cn('whitespace-nowrap', enFoco ? 'font-medium text-fg' : 'text-fg')}>
                            {conMayusculaInicial(nombreDelMes(p.month))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {formatCurrency(p.facturadoCop)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg">
                            {formatCurrency(p.recaudadoCop)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {/* Sin facturar no hay porcentaje: un «0 %» diría que no se cobró. */}
                            {pct === null ? 'Sin facturar' : `${pct} %`}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {formatCurrency(p.dispersadoCop)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </section>

            {/* Los recibos del mes, agrupados por medio de pago (así los manda
                el back). El pie suma: es la misma cifra que «Llegó». */}
            <section className="overflow-hidden rounded-lg border border-border bg-surface">
              <Table data-testid="por-medio">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Medio de pago</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Recibos</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.porMedio.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="p-0" data-testid="sin-recibos">
                        <SinDatos
                          queSon="recibos de caja"
                          icono={Receipt}
                          titulo="Ningún recibo de caja en el mes"
                          descripcion={`Los recibos con fecha en ${nombreDelMes(month)} aparecen acá, agrupados por cómo entró la plata.`}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    resumen.porMedio.map((m) => (
                      <TableRow key={m.medio} data-testid="medio-fila">
                        <TableCell className="text-fg">{nombreDelMedio(m.medio)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-fg-muted">{m.cantidad}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-fg">
                          {formatCurrency(m.valorCop)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {resumen.porMedio.length > 0 && (
                  <TableFooter>
                    <TableRow data-testid="medio-total">
                      <TableCell className="font-medium text-fg">Total</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-fg-muted">
                        {totalDeRecibos.cantidad}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums text-fg">
                        {formatCurrency(totalDeRecibos.valorCop)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </section>
          </>
        )}
      </EstadoDeDatos>
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
      className="space-y-2 rounded-lg border border-border bg-surface p-5"
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
