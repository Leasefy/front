'use client';

/**
 * El libro auxiliar: todo lo que pasó en UNA cuenta, con el saldo corrido en
 * la naturaleza de la cuenta (en una de débito, los débitos suman; en una de
 * crédito, restan).
 *
 * ── Los números viven en la tabla, no arriba (Nico, 2026-09-03) ────────────
 *
 * Antes había una franja con «Saldo inicial» y «Saldo final» encima de una
 * tabla que ya traía las dos cosas (primera fila y pie). Repetido dos veces,
 * el lector no sabe cuál mirar. Ahora la cuenta y su naturaleza se leen en el
 * filtro —que es donde se eligen— y los montos, una sola vez, en la tabla:
 * saldo inicial como primera fila y saldo final en el pie de totales.
 *
 * El back devuelve el auxiliar entero en un pedido (no pagina), así que el
 * recorte es de presentación: `useTablePagination`. El saldo inicial sólo se
 * pinta en la primera página — en la tercera no sería «inicial» de nada.
 */

import { useCallback, useEffect, useState } from 'react';
import { ListMagnifyingGlass } from '@phosphor-icons/react';

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
import { contabilidadApi, type LibroAuxiliar as Libro } from '@/lib/api/contabilidad.service';
import { diaLegible, hoy, primerDiaDelMes, rangoInvertido } from '@/lib/contabilidad/fechas';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { useCuentas } from '../use-cuentas';

const COLUMNAS = 7;

export function LibroAuxiliar() {
  const { cuentas, cargando: cargandoCuentas, error: errorDeCuentas, recargar } = useCuentas();
  const [cuentaId, setCuentaId] = useState('');
  const [rango, setRango] = useState({ desde: primerDiaDelMes(), hasta: hoy() });
  const [libro, setLibro] = useState<Libro | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const invertido = rangoInvertido(rango.desde, rango.hasta);

  const renglones = cuentaId && libro ? libro.renglones : [];
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(renglones, { resetKey: `${cuentaId}|${rango.desde}|${rango.hasta}` });

  const cargar = useCallback(async () => {
    if (!cuentaId || invertido) return;
    setCargando(true);
    setError(null);
    try {
      setLibro(
        await contabilidadApi.reportes.libroAuxiliar(cuentaId, {
          desde: rango.desde || undefined,
          hasta: rango.hasta || undefined,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [cuentaId, rango.desde, rango.hasta, invertido]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sinCuenta = !cuentaId;
  const vacio = !sinCuenta && libro !== null && libro.renglones.length === 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,420px)]">
        <div className="space-y-1.5">
          <Label>Cuenta</Label>
          <SelectorDeCuenta
            cuentas={cuentas}
            value={cuentaId}
            onChange={setCuentaId}
            placeholder={cargandoCuentas ? 'Cargando el plan…' : 'Buscá por código o nombre'}
            disabled={cargandoCuentas}
            className="w-full"
          />
          {errorDeCuentas ? (
            <p className="text-xs text-danger" role="alert">
              No se pudo cargar el plan de cuentas.{' '}
              <button type="button" className="underline" onClick={() => void recargar()}>
                Reintentar
              </button>
            </p>
          ) : null}
          {libro && cuentaId ? (
            <p className="text-caption text-fg-subtle">
              Naturaleza {libro.cuenta.naturaleza === 'DEBITO' ? 'débito' : 'crédito'}: el saldo
              corre en ese sentido.
            </p>
          ) : null}
        </div>
        <RangoDeFechas desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <EstadoDeDatos
          cargando={cargando && libro === null}
          error={error}
          queEs="el libro auxiliar"
          onReintentar={cargar}
          esqueleto={
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          }
        >
          <div className={cn(cargando && 'opacity-60')} aria-busy={cargando || undefined}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead numeric>Asiento</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead numeric>Débito</TableHead>
                  <TableHead numeric>Crédito</TableHead>
                  <TableHead numeric>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sinCuenta || vacio ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNAS} className="p-0">
                      <SinDatos
                        queSon="movimientos"
                        icono={ListMagnifyingGlass}
                        titulo={sinCuenta ? 'Elegí una cuenta' : 'Sin movimientos en este rango'}
                        descripcion={
                          sinCuenta
                            ? 'El auxiliar muestra cada movimiento de una cuenta con su saldo corrido.'
                            : 'La cuenta no se movió entre esas fechas: el saldo que arrastra es el que ya traía.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Sólo en la primera página: en la tercera no sería el
                        saldo «inicial» de nada. */}
                    {page === 1 && libro ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} muted className="whitespace-nowrap">
                          Saldo inicial
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap">
                          <Monto valor={libro.saldoInicialCop} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {pageItems.map((r, i) => (
                      <TableRow key={`${r.asientoId}-${i}`}>
                        <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                          {diaLegible(r.fecha)}
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap font-mono">
                          {r.numero}
                        </TableCell>
                        <TableCell className="max-w-[340px]">
                          <span className="flex items-baseline gap-1.5">
                            <span className="truncate text-fg" title={r.descripcionAsiento}>
                              {r.descripcionAsiento}
                            </span>
                            {r.descripcion ? (
                              <span
                                className="max-w-[40%] shrink-0 truncate text-caption text-fg-muted"
                                title={r.descripcion}
                              >
                                · {r.descripcion}
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell muted className="whitespace-nowrap">
                          {r.terceroTipo ? (
                            <span
                              className="font-mono text-caption"
                              title={`${r.terceroTipo} ${r.terceroId ?? ''}`.trim()}
                            >
                              {r.terceroTipo}
                            </span>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap">
                          <Monto valor={r.debitoCop} vacioSiCero />
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap">
                          <Monto valor={r.creditoCop} vacioSiCero />
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap">
                          <Monto valor={r.saldoCop} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
              {libro && !sinCuenta && !vacio ? (
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="whitespace-nowrap text-sm font-medium text-fg">
                      Totales del período
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap">
                      <Monto valor={libro.debitosCop} className="font-medium" />
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap">
                      <Monto valor={libro.creditosCop} className="font-medium" />
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap">
                      <Monto valor={libro.saldoFinalCop} className="font-medium" />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>

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
        </EstadoDeDatos>
      </section>
    </div>
  );
}
