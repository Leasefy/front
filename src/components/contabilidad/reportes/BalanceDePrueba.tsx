'use client';

/**
 * El balance de prueba: por cuenta, saldo anterior, débitos, créditos y saldo
 * final; abajo, los totales y si cuadra.
 *
 * `cuadra === false` no es un dato más: significa que la partida doble se
 * rompió en algún lado y se pinta como el error que es — por eso el veredicto
 * va ARRIBA de la tabla y no se pagina con ella. `TablaDeBalance` va aparte y
 * sin red para poder probarla con datos en la mano.
 *
 * ── Una fila por cuenta, en una línea, y con pie (Nico, 2026-09-03) ────────
 *
 * La naturaleza de la cuenta era un segundo renglón debajo del nombre: con el
 * plan entero (99 cuentas) la tabla se iba tres pantallas para abajo. Va como
 * sufijo chico en la misma línea, y el recorte lo hace la paginación. El back
 * devuelve el balance completo en un solo pedido (no pagina), así que el
 * recorte es de presentación: `useTablePagination`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Scales, WarningCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/pagination';
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
import { contabilidadApi, type BalanceDePrueba as Balance } from '@/lib/api/contabilidad.service';
import { hoy, primerDiaDelMes, rangoInvertido } from '@/lib/contabilidad/fechas';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';

const COLUMNAS = 6;

// ── La tabla, pura ──────────────────────────────────────────────────────────

export function TablaDeBalance({ balance }: { balance: Balance }) {
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(balance.filas, {
      resetKey: `${balance.desde ?? ''}|${balance.hasta ?? ''}|${balance.filas.length}`,
    });

  return (
    <div className="space-y-4" data-testid="tabla-de-balance">
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-md border border-border p-3',
          balance.cuadra ? 'bg-success-soft' : 'bg-danger-soft',
        )}
        role={balance.cuadra ? 'status' : 'alert'}
        data-testid="veredicto-del-balance"
      >
        {balance.cuadra ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" aria-hidden="true" />
        ) : (
          <WarningCircle className="h-5 w-5 flex-shrink-0 text-danger" aria-hidden="true" />
        )}
        <div className="text-sm">
          {balance.cuadra ? (
            <p className="font-medium text-success">Cuadra: los débitos son iguales a los créditos.</p>
          ) : (
            <p className="font-medium text-danger">
              No cuadra: hay una diferencia de <Monto valor={Math.abs(balance.diferenciaCop)} />{' '}
              {balance.diferenciaCop > 0 ? 'a favor de los débitos' : 'a favor de los créditos'}. Es
              un defecto del libro, no de este informe — avisale a quien lo administra.
            </p>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead numeric>Saldo anterior</TableHead>
              <TableHead numeric>Débitos</TableHead>
              <TableHead numeric>Créditos</TableHead>
              <TableHead numeric>Saldo final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((f) => (
              <TableRow key={f.cuentaId} data-testid="fila-de-balance">
                <TableCell className="whitespace-nowrap font-mono tabular-nums">{f.codigo}</TableCell>
                <TableCell className="max-w-[360px]">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-fg" title={f.nombre}>
                      {f.nombre}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-caption uppercase tracking-wide text-fg-subtle">
                      {f.naturaleza === 'DEBITO' ? 'débito' : 'crédito'}
                    </span>
                  </span>
                </TableCell>
                <TableCell numeric className="whitespace-nowrap">
                  <Monto valor={f.saldoAnteriorCop} vacioSiCero />
                </TableCell>
                <TableCell numeric className="whitespace-nowrap">
                  <Monto valor={f.debitosCop} vacioSiCero />
                </TableCell>
                <TableCell numeric className="whitespace-nowrap">
                  <Monto valor={f.creditosCop} vacioSiCero />
                </TableCell>
                <TableCell numeric className="whitespace-nowrap">
                  <Monto valor={f.saldoFinalCop} className="font-medium" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={3} className="whitespace-nowrap text-sm font-medium text-fg">
                Totales del período
              </TableCell>
              <TableCell numeric data-testid="total-debitos" className="whitespace-nowrap">
                <Monto valor={balance.totalDebitosCop} className="font-medium" />
              </TableCell>
              <TableCell numeric data-testid="total-creditos" className="whitespace-nowrap">
                <Monto valor={balance.totalCreditosCop} className="font-medium" />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>

        {shouldPaginate ? (
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
        ) : null}
      </section>
    </div>
  );
}

// ── La pantalla, con red ────────────────────────────────────────────────────

export function BalanceDePrueba() {
  const [rango, setRango] = useState({ desde: primerDiaDelMes(), hasta: hoy() });
  const [soloConMovimiento, setSoloConMovimiento] = useState(true);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const invertido = rangoInvertido(rango.desde, rango.hasta);

  const cargar = useCallback(async () => {
    if (invertido) return;
    setCargando(true);
    setError(null);
    try {
      setBalance(
        await contabilidadApi.reportes.balanceDePrueba({
          desde: rango.desde || undefined,
          hasta: rango.hasta || undefined,
          soloConMovimiento,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [rango.desde, rango.hasta, soloConMovimiento, invertido]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const vacio = useMemo(() => balance !== null && balance.filas.length === 0, [balance]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-6 rounded-lg border border-border bg-surface p-4">
        <div className="w-full max-w-md">
          <RangoDeFechas desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id="balance-solo-con-movimiento"
            checked={soloConMovimiento}
            onCheckedChange={(v) => setSoloConMovimiento(v === true)}
          />
          <Label htmlFor="balance-solo-con-movimiento" className="font-normal">
            Sólo cuentas con movimiento o saldo
          </Label>
        </div>
      </div>

      <EstadoDeDatos
        cargando={cargando && balance === null}
        error={error}
        vacio={vacio}
        queEs="el balance de prueba"
        onReintentar={cargar}
        esqueleto={
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        }
        cuandoVacio={
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead numeric>Saldo anterior</TableHead>
                  <TableHead numeric>Débitos</TableHead>
                  <TableHead numeric>Créditos</TableHead>
                  <TableHead numeric>Saldo final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COLUMNAS} className="p-0">
                    {/* El vacío del balance SIEMPRE es «filtraste de más»: el
                        plan de cuentas existe, lo que no hay es movimiento en
                        ese rango. Por eso lleva copy propio y no el de
                        `hayFiltros`, cuyo texto genérico es masculino
                        («Ningún cuenta…»). */}
                    <SinDatos
                      queSon="cuentas con movimiento"
                      icono={Scales}
                      titulo="Sin movimientos en este rango"
                      descripcion="Ninguna cuenta se movió ni traía saldo entre esas fechas."
                      accion={
                        <Button
                          variant="outline"
                          hideArrow
                          onClick={() => {
                            setRango({ desde: '', hasta: '' });
                            setSoloConMovimiento(false);
                          }}
                        >
                          Ver el plan entero
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        }
      >
        {balance ? (
          <div className={cn(cargando && 'opacity-60')} aria-busy={cargando || undefined}>
            <TablaDeBalance balance={balance} />
          </div>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}
