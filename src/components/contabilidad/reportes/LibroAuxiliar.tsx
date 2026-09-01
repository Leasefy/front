'use client';

/**
 * El libro auxiliar: todo lo que pasó en UNA cuenta, con el saldo corrido en
 * la naturaleza de la cuenta (en una de débito, los débitos suman; en una de
 * crédito, restan).
 */

import { useCallback, useEffect, useState } from 'react';
import { ListMagnifyingGlass } from '@phosphor-icons/react';

import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
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
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { contabilidadApi, type LibroAuxiliar as Libro } from '@/lib/api/contabilidad.service';
import { diaLegible, hoy, primerDiaDelMes, rangoInvertido } from '@/lib/contabilidad/fechas';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { etiquetaDeCuenta, useCuentas } from '../use-cuentas';

export function LibroAuxiliar() {
  const { cuentas, cargando: cargandoCuentas, error: errorDeCuentas, recargar } = useCuentas();
  const [cuentaId, setCuentaId] = useState('');
  const [rango, setRango] = useState({ desde: primerDiaDelMes(), hasta: hoy() });
  const [libro, setLibro] = useState<Libro | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const invertido = rangoInvertido(rango.desde, rango.hasta);

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

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm lg:grid-cols-[minmax(280px,1fr)_minmax(280px,420px)]">
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
        </div>
        <RangoDeFechas desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
      </div>

      {!cuentaId ? (
        <EmptyState
          icon={ListMagnifyingGlass}
          title="Elegí una cuenta"
          description="El auxiliar muestra cada movimiento de una cuenta con su saldo corrido."
        />
      ) : error ? (
        <FalloDeCarga error={error} queEs="el libro auxiliar" onReintentar={cargar} />
      ) : cargando && !libro ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : libro ? (
        <div className={cn('space-y-4', cargando && 'opacity-60')} aria-busy={cargando}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-fg">{etiquetaDeCuenta(libro.cuenta)}</p>
              <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
                naturaleza {libro.cuenta.naturaleza === 'DEBITO' ? 'débito' : 'crédito'}
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="text-fg-muted">Saldo inicial</dt>
                <dd>
                  <Monto valor={libro.saldoInicialCop} />
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-fg-muted">Saldo final</dt>
                <dd>
                  <Monto valor={libro.saldoFinalCop} className="font-medium" />
                </dd>
              </div>
            </dl>
          </div>

          {libro.renglones.length === 0 ? (
            <EmptyState
              icon={ListMagnifyingGlass}
              title="Sin movimientos en este rango"
              description="La cuenta no se movió entre esas fechas. El saldo inicial es el que arrastra."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
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
                  <TableRow>
                    <TableCell colSpan={6} muted className="text-sm">
                      Saldo inicial
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={libro.saldoInicialCop} />
                    </TableCell>
                  </TableRow>
                  {libro.renglones.map((r, i) => (
                    <TableRow key={`${r.asientoId}-${i}`}>
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums">{diaLegible(r.fecha)}</span>
                      </TableCell>
                      <TableCell numeric>
                        <span className="font-mono tabular-nums">{r.numero}</span>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <span className="block truncate text-sm" title={r.descripcionAsiento}>
                          {r.descripcionAsiento}
                        </span>
                        {r.descripcion ? (
                          <span className="block truncate text-xs text-fg-muted" title={r.descripcion}>
                            {r.descripcion}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell muted>
                        {r.terceroTipo ? (
                          <span className="font-mono text-xs">
                            {r.terceroTipo}
                            <span className="block text-fg-subtle">{r.terceroId}</span>
                          </span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={r.debitoCop} vacioSiCero />
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={r.creditoCop} vacioSiCero />
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={r.saldoCop} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm font-medium text-fg">
                      Totales del período
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={libro.debitosCop} className="font-medium" />
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={libro.creditosCop} className="font-medium" />
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={libro.saldoFinalCop} className="font-medium" />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
