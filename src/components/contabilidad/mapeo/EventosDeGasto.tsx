'use client';

/**
 * Los siete eventos de gasto del mapeo contable (contrato del 18-09, §2).
 *
 * ── Por qué es un bloque aparte y no siete filas más de la tabla ────────────
 *
 * El mapeo de recaudo y giro puede estar completo —y los recibos asentándose—
 * mientras el de gasto está vacío, porque son cosas distintas: uno lo necesita
 * cualquier inmobiliaria desde el primer recibo, el otro sólo cuando empieza a
 * registrar sus propias facturas. Si fueran la misma tabla, una inmobiliaria con
 * su paso 5 hecho lo vería «incompleto» de un día para otro sin haber cambiado
 * nada, y el banner de arriba diría «faltan 7 de 17».
 *
 * Por eso el back los devuelve en `eventosDeGasto` con su propio
 * `completoGastos`, y por eso este bloque tiene su propio estado.
 *
 * ── 🔴 Sin la migración no se muestra editable, y se dice por qué ───────────
 *
 * `hayEventosDeGasto: false` significa que la base no tiene los siete valores
 * nuevos del enum `EventoContable`. Un `PUT` con uno de ellos devuelve 400
 * `EVENTO_SIN_MIGRACION` y **no escribe nada**: o sea que se perdería también lo
 * que sí se podía guardar en esa misma llamada. Así que con la migración
 * ausente el bloque sale en modo lectura, explicando qué falta y qué no se
 * puede hacer todavía (causar una factura de proveedor), en vez de ofrecer un
 * selector que sólo produce errores.
 *
 * `undefined` se trata igual que `false`: un back anterior al 18-09 no manda el
 * campo, y afirmar que la migración está por la ausencia del dato sería inventar.
 */

import { useMemo, useState } from 'react';
import { CheckCircle, Sparkle, Warning } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EventoContable, MapeoDeEvento, CuentaPuc } from '@/lib/api/contabilidad.service';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { FaltaLaMigracion, Nota } from '../piezas';
import { NOMBRE_DEL_LADO } from './mapeo';
import { TituloDeBloque } from '@/components/finanzas/piezas';

export interface EventosDeGastoProps {
  /** Los siete del back. `undefined` = un back que todavía no los manda. */
  eventos: MapeoDeEvento[] | undefined;
  /** `false`/`undefined` = la base no tiene los valores nuevos del enum. */
  hay: boolean | undefined;
  completo: boolean | undefined;
  cuentas: readonly CuentaPuc[];
  /** Guarda un evento. Devuelve la promesa: la fila espera al back. */
  onAsignar: (evento: EventoContable, cuentaId: string, nombre: string) => Promise<void>;
  /** Cuáles tienen un PUT en vuelo. */
  guardando: ReadonlySet<EventoContable>;
  /** `false` = el rol no escribe; `motivoSinEscritura` dice por qué. */
  puedeEscribir: boolean;
  motivoSinEscritura: string | null;
}

/**
 * Qué deja de funcionar sin este mapeo, dicho en lo que la persona hace y no en
 * nombres de eventos. Es la misma idea que `loQueNoSeAsienta` para los de
 * recaudo.
 */
export function loQueNoSePuedeCausar(faltantes: readonly EventoContable[]): string[] {
  const f = new Set<string>(faltantes);
  const frases: string[] = [];
  if (f.has('GASTO_SIN_RUBRO') || f.has('GASTO_POR_PAGAR')) {
    frases.push('causar una factura de proveedor (el gasto y la cuenta por pagar)');
  }
  if (f.has('IVA_DESCONTABLE')) {
    frases.push('separar el IVA descontable de la factura del gasto');
  }
  if (
    f.has('RETEFUENTE_PRACTICADA') ||
    f.has('RETEIVA_PRACTICADA') ||
    f.has('RETEICA_PRACTICADA')
  ) {
    frases.push('registrar las retenciones que se le practican al proveedor');
  }
  if (f.has('EGRESO_BANCOS')) {
    frases.push('asentar la salida del banco al pagar un lote de egresos');
  }
  return frases;
}

export function EventosDeGasto({
  eventos,
  hay,
  completo,
  cuentas,
  onAsignar,
  guardando,
  puedeEscribir,
  motivoSinEscritura,
}: EventosDeGastoProps) {
  const lista = eventos ?? [];
  const faltantes = useMemo(
    () => lista.filter((e) => e.cuenta === null && !e.opcional).map((e) => e.evento),
    [lista],
  );
  const apagado = useMemo(() => loQueNoSePuedeCausar(faltantes), [faltantes]);

  return (
    <section className="space-y-4" data-testid="eventos-de-gasto">
      <TituloDeBloque
        titulo="Eventos de gasto"
        explicacion="A qué cuenta del PUC va cada línea del asiento de una factura de proveedor y del pago de un lote de egresos: el gasto, el IVA descontable, la cuenta por pagar, las tres retenciones y la salida del banco."
      />

      {/* 🔴 `hay !== true`: `undefined` de un back viejo se trata como `false`. */}
      {hay !== true ? (
        <FaltaLaMigracion
          motivo={
            'Falta la migración que agrega los siete valores nuevos al enum de eventos contables ' +
            '(20260918100000_rubros_del_pyg_y_sede_en_el_movimiento).'
          }
          queSeEspera="decir a qué cuenta va cada línea del asiento de un gasto"
          mientrasTanto="Sin estos eventos, una factura de proveedor se puede registrar pero no se puede causar: no hay a qué cuenta mandar el gasto ni la cuenta por pagar. El resto del mapeo —recaudos y giros— funciona igual."
          testId="eventos-de-gasto-sin-migracion"
        />
      ) : lista.length === 0 ? (
        <Nota testId="eventos-de-gasto-vacio">
          <p>
            El back dice que la base ya tiene los eventos de gasto pero no devolvió ninguno. No hay
            nada que mapear todavía: recargá la pantalla o avisale a quien administra el sistema.
          </p>
        </Nota>
      ) : (
        <>
          {completo ? (
            <Nota testId="eventos-de-gasto-completo">
              <p>
                Los siete tienen cuenta: una factura de proveedor se puede causar y un lote pagado
                se asienta solo.
              </p>
            </Nota>
          ) : (
            <div
              className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
              role="status"
              data-testid="eventos-de-gasto-incompleto"
            >
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">
                  Faltan {faltantes.length} de {lista.length}: sin cuenta, ese asiento no se genera
                </p>
                {apagado.length > 0 ? (
                  <p data-testid="eventos-de-gasto-apagado">
                    Hoy no se puede: {apagado.join('; ')}.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px]">Evento</TableHead>
                    <TableHead>Lado</TableHead>
                    <TableHead className="min-w-[280px]">Cuenta del PUC</TableHead>
                    <TableHead>Propuesta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((e) => (
                    <TableRow key={e.evento} data-testid={`evento-de-gasto-${e.evento}`}>
                      <TableCell className="max-w-[320px]">
                        <p className="font-medium text-fg">{e.nombre}</p>
                        <p className="truncate text-caption text-fg-muted" title={e.explicacion}>
                          {e.explicacion}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={e.lado === 'DEBE' ? 'secondary' : 'outline'}>
                          {NOMBRE_DEL_LADO[e.lado]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SelectorDeCuenta
                            cuentas={cuentas}
                            value={e.cuenta?.id ?? ''}
                            onChange={(cuentaId) => void onAsignar(e.evento, cuentaId, e.nombre)}
                            soloImputables
                            disabled={!puedeEscribir || guardando.has(e.evento)}
                            placeholder="Sin cuenta: este asiento no se genera"
                            className="w-full"
                          />
                          {e.cuenta ? (
                            <CheckCircle
                              className="h-4 w-4 shrink-0 text-success"
                              aria-label="Con cuenta"
                            />
                          ) : (
                            <Warning
                              className="h-4 w-4 shrink-0 text-warning"
                              aria-label="Falta la cuenta"
                              data-testid={`falta-gasto-${e.evento}`}
                            />
                          )}
                        </div>
                        {!puedeEscribir && motivoSinEscritura ? (
                          <p className="mt-1 text-caption text-fg-muted">{motivoSinEscritura}</p>
                        ) : null}
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
                                disabled={!puedeEscribir || guardando.has(e.evento)}
                                title={motivoSinEscritura ?? undefined}
                                onClick={() =>
                                  void onAsignar(e.evento, e.propuesta!.id, e.nombre)
                                }
                                data-testid={`usar-propuesta-gasto-${e.evento}`}
                              >
                                <Sparkle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                Usar
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <span
                            className="font-mono text-xs text-fg-subtle"
                            title="Créala en el plan de cuentas con ese código, o elegí otra"
                          >
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
        </>
      )}
    </section>
  );
}

/** Estado local del bloque, para que la pantalla que lo contiene no lo derive. */
export function useGuardandoDeGasto() {
  const [guardando, setGuardando] = useState<ReadonlySet<EventoContable>>(new Set());
  const marcar = (evento: EventoContable, activo: boolean) =>
    setGuardando((previo) => {
      const siguiente = new Set(previo);
      if (activo) siguiente.add(evento);
      else siguiente.delete(evento);
      return siguiente;
    });
  return { guardando, marcar };
}
