'use client';

/**
 * El mapeo contable: ocho eventos, una cuenta por evento.
 *
 * Cada fila se guarda sola al elegir la cuenta (un PUT por fila): el contador
 * ajusta una y sigue; no hay un «guardar todo» que se pueda olvidar. La
 * escritura la decide el back (ADMIN o CONTADOR) y el 403 se muestra en
 * palabras, igual que en el resto de la contabilidad.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '@leasefy/cadence';
import { CheckCircle, Sparkle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  type AsientosFaltantes,
  type EventoContable,
  type MapeoContable as Mapeo,
} from '@/lib/api/contabilidad.service';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { useCuentas } from '../use-cuentas';
import { NOMBRE_DEL_LADO, eventosSembrables, loQueNoSeAsienta } from './mapeo';

export function MapeoContable() {
  const [mapeo, setMapeo] = useState<Mapeo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState<ReadonlySet<EventoContable>>(new Set());
  const [sembrando, setSembrando] = useState(false);
  /*
   * Lo que pasó sin asiento por falta de mapeo (2026-09-02). Antes esto era
   * un `warn` en el log del back y la pantalla decía «se asienta a mano»;
   * ahora se cuenta y se reprocesa con un botón. `null` = no se pudo leer:
   * la tabla de mapeo sigue sirviendo igual.
   */
  const [faltantes, setFaltantes] = useState<AsientosFaltantes | null>(null);
  const [reprocesando, setReprocesando] = useState(false);
  const { cuentas, cargando: cuentasCargando } = useCuentas();

  const cargarFaltantes = useCallback(async () => {
    try {
      setFaltantes(await contabilidadApi.asientos.faltantes());
    } catch {
      setFaltantes(null);
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setMapeo(await contabilidadApi.mapeo.obtener());
      void cargarFaltantes();
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [cargarFaltantes]);

  const reprocesar = async () => {
    setReprocesando(true);
    try {
      const r = await contabilidadApi.asientos.reprocesar();
      if (r.asentados > 0) {
        toast.success(`${r.asentados} asiento${r.asentados === 1 ? '' : 's'} generado${r.asentados === 1 ? '' : 's'}.`);
      }
      if (r.sinResolver > 0) {
        toast.warning(
          `${r.sinResolver} sigue${r.sinResolver === 1 ? '' : 'n'} sin asiento${r.motivos[0] ? `: ${r.motivos[0]}` : '.'}`,
        );
      }
      if (r.asentados === 0 && r.sinResolver === 0) toast.success('No había nada pendiente de asentar.');
      await cargarFaltantes();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo reprocesar.'));
    } finally {
      setReprocesando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sembrables = useMemo(() => (mapeo ? eventosSembrables(mapeo) : []), [mapeo]);
  const apagados = useMemo(() => (mapeo ? loQueNoSeAsienta(mapeo.faltantes) : []), [mapeo]);

  const marcar = (evento: EventoContable, activo: boolean) =>
    setGuardando((prev) => {
      const next = new Set(prev);
      if (activo) next.add(evento);
      else next.delete(evento);
      return next;
    });

  const asignar = async (evento: EventoContable, cuentaId: string, nombre: string) => {
    if (!cuentaId) return;
    marcar(evento, true);
    try {
      setMapeo(await contabilidadApi.mapeo.guardar([{ evento, cuentaId }]));
      toast.success(`«${nombre}» quedó en la cuenta elegida.`);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo guardar la cuenta.'));
    } finally {
      marcar(evento, false);
    }
  };

  const sembrar = async () => {
    setSembrando(true);
    try {
      const r = await contabilidadApi.mapeo.sembrar();
      setMapeo(r.mapeo);
      if (r.asignados.length > 0) {
        toast.success(
          `${r.asignados.length} evento${r.asignados.length === 1 ? '' : 's'} con la cuenta propuesta.`,
        );
      }
      if (r.sinCuenta.length > 0) {
        toast.warning(
          `Sin cuenta propuesta para ${r.sinCuenta.length}: el PUC no tiene ${r.sinCuenta
            .map((s) => s.codigo)
            .join(', ')}.`,
        );
      }
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudieron asignar las cuentas propuestas.'));
    } finally {
      setSembrando(false);
    }
  };

  if (cargando || cuentasCargando) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-fg-muted">Cargando el mapeo…</p>
      </div>
    );
  }
  if (error || !mapeo) {
    return <FalloDeCarga error={error} queEs="el mapeo contable" onReintentar={cargar} />;
  }

  return (
    <div className="space-y-5" data-testid="mapeo-contable">
      {mapeo.completo ? (
        <Banner variant="success" title="Todos los eventos tienen cuenta">
          Los cobros se causan al emitirse, y los recibos de caja, sus anulaciones y los lotes
          pagados se asientan solos.
        </Banner>
      ) : (
        <Banner variant="warning" title="Sin una cuenta en un evento, ese asiento no se genera">
          <div className="space-y-3">
            {apagados.length > 0 && (
              <p>
                Hoy quedan sin asiento automático: {apagados.join('; ')}. Lo que se quede sin
                asentar se recupera con «Reprocesar» cuando el mapeo esté completo.
              </p>
            )}
            {sembrables.length > 0 && (
              <Button size="sm" hideArrow onClick={() => void sembrar()} disabled={sembrando} data-testid="usar-propuestas">
                <Sparkle className="h-4 w-4" aria-hidden="true" />
                {sembrando
                  ? 'Asignando…'
                  : `Usar las cuentas propuestas (${sembrables.length})`}
              </Button>
            )}
          </div>
        </Banner>
      )}

      {faltantes && faltantes.total > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
          data-testid="asientos-faltantes"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-fg">
              {faltantes.total === 1 ? '1 movimiento sin asiento' : `${faltantes.total} movimientos sin asiento`}
            </p>
            <p className="text-xs text-fg-muted">
              {[
                faltantes.cobros > 0 ? `${faltantes.cobros} cobro${faltantes.cobros === 1 ? '' : 's'} sin causar` : null,
                faltantes.recibos > 0 ? `${faltantes.recibos} recibo${faltantes.recibos === 1 ? '' : 's'} de caja` : null,
                faltantes.lotes > 0 ? `${faltantes.lotes} lote${faltantes.lotes === 1 ? '' : 's'} de giros` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              {faltantes.mapeoCompleto
                ? '. Con el mapeo completo, se asientan con la fecha de su documento.'
                : '. Completá el mapeo y reprocesá.'}
            </p>
          </div>
          <Button size="sm" hideArrow onClick={() => void reprocesar()} disabled={reprocesando} data-testid="reprocesar-asientos">
            {reprocesando ? 'Reprocesando…' : 'Reprocesar'}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Lado</TableHead>
              <TableHead className="min-w-[280px]">Cuenta del PUC</TableHead>
              <TableHead>Propuesta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mapeo.eventos.map((e) => (
              <TableRow key={e.evento} data-testid={`evento-${e.evento}`}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium text-fg">{e.nombre}</p>
                    <p className="max-w-md text-xs text-fg-muted">{e.explicacion}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={e.lado === 'DEBE' ? 'secondary' : 'outline'}>{NOMBRE_DEL_LADO[e.lado]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <SelectorDeCuenta
                      cuentas={cuentas}
                      value={e.cuenta?.id ?? ''}
                      onChange={(cuentaId) => void asignar(e.evento, cuentaId, e.nombre)}
                      soloImputables
                      disabled={guardando.has(e.evento)}
                      placeholder="Sin cuenta: este asiento no se genera"
                      className="w-full"
                    />
                    {e.cuenta ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-success" aria-label="Con cuenta" />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {e.propuesta ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-fg-muted">
                        {e.propuesta.codigo} · {e.propuesta.nombre}
                      </span>
                      {!e.cuenta && e.propuesta.activa && e.propuesta.imputable ? (
                        <Button
                          variant="outline"
                          size="sm"
                          hideArrow
                          onClick={() => void asignar(e.evento, e.propuesta!.id, e.nombre)}
                          disabled={guardando.has(e.evento)}
                        >
                          Usar
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-fg-subtle" title="Creala en el plan de cuentas con ese código, o elegí otra">
                      {e.codigoPropuesto} no está en el PUC
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
