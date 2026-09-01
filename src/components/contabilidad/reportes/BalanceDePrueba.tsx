'use client';

/**
 * El balance de prueba: por cuenta, saldo anterior, débitos, créditos y saldo
 * final; abajo, los totales y si cuadra.
 *
 * `cuadra === false` no es un dato más: significa que la partida doble se
 * rompió en algún lado y se pinta como el error que es. `TablaDeBalance` va
 * aparte y sin red para poder probarla con datos en la mano.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Scales, WarningCircle } from '@phosphor-icons/react';

import { Checkbox } from '@/components/ui/checkbox';
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
import { contabilidadApi, type BalanceDePrueba as Balance } from '@/lib/api/contabilidad.service';
import { hoy, primerDiaDelMes, rangoInvertido } from '@/lib/contabilidad/fechas';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';

// ── La tabla, pura ──────────────────────────────────────────────────────────

export function TablaDeBalance({ balance }: { balance: Balance }) {
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

      <div className="overflow-x-auto rounded-md border border-border">
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
            {balance.filas.map((f) => (
              <TableRow key={f.cuentaId} data-testid="fila-de-balance">
                <TableCell>
                  <span className="font-mono text-sm tabular-nums">{f.codigo}</span>
                </TableCell>
                <TableCell>
                  <span className="block text-sm">{f.nombre}</span>
                  <span className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
                    {f.naturaleza === 'DEBITO' ? 'débito' : 'crédito'}
                  </span>
                </TableCell>
                <TableCell numeric>
                  <Monto valor={f.saldoAnteriorCop} vacioSiCero />
                </TableCell>
                <TableCell numeric>
                  <Monto valor={f.debitosCop} vacioSiCero />
                </TableCell>
                <TableCell numeric>
                  <Monto valor={f.creditosCop} vacioSiCero />
                </TableCell>
                <TableCell numeric>
                  <Monto valor={f.saldoFinalCop} className="font-medium" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="text-sm font-medium text-fg">
                Totales del período
              </TableCell>
              <TableCell numeric data-testid="total-debitos">
                <Monto valor={balance.totalDebitosCop} className="font-medium" />
              </TableCell>
              <TableCell numeric data-testid="total-creditos">
                <Monto valor={balance.totalCreditosCop} className="font-medium" />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
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
      <div className="flex flex-wrap items-end gap-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
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

      {error ? (
        <FalloDeCarga error={error} queEs="el balance de prueba" onReintentar={cargar} />
      ) : cargando && !balance ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : vacio ? (
        <EmptyState
          icon={Scales}
          title="Sin movimientos en este rango"
          description="Ninguna cuenta se movió ni traía saldo. Ampliá el rango o desmarcá «sólo cuentas con movimiento» para ver el plan entero."
        />
      ) : balance ? (
        <div className={cn(cargando && 'opacity-60')} aria-busy={cargando}>
          <TablaDeBalance balance={balance} />
        </div>
      ) : null}
    </div>
  );
}
