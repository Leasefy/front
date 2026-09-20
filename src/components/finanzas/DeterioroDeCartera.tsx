'use client';

/**
 * El deterioro (provisión) de cartera: sugerido, editable, y aprobado cada mes.
 *
 * ── La regla, con las palabras de Nico (17-09) ──────────────────────────────
 *
 * «Provisión por edades SUGERIDA y EDITABLE (ej. 0 % hasta 90 días, 50 % de 90
 * a 180, 100 % de 180+), que el contador APRUEBA CADA MES antes de asentarla.»
 *
 * Tres palabras hacen el diseño de esta pantalla: *sugerida* (el porcentaje del
 * sistema va al lado, no en lugar del elegido), *editable* (un input por tramo,
 * y la provisión se recalcula mientras se escribe) y *aprueba cada mes* (nada
 * se asienta hasta que una persona lo apruebe).
 *
 * ── 🔴 Lo que se asienta es el MOVIMIENTO, no el saldo ──────────────────────
 *
 * La provisión es un saldo acumulado. Lo que va al libro cada mes es la
 * DIFERENCIA con la provisión aprobada del mes anterior. Asentar el saldo
 * entero cada mes lo duplicaría — por eso el movimiento es la cifra grande de
 * la pantalla y el saldo va al lado, explicado.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Esconder los `avisos` del back.** Dicen las dos cosas que el contador
 *    tiene que decidir: qué hacer con lo que está en siniestro (lo reclama la
 *    aseguradora, no el inquilino) y que sólo se provisiona el CAPITAL, porque
 *    el interés de mora no está causado hasta que se factura.
 * 2. **Aprobar sin decir qué se va a asentar.** El diálogo repite el número y
 *    su signo antes del clic.
 * 3. **Anular sin motivo.** Un asiento no se borra: se reversa, y la reversa
 *    lleva motivo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Prohibit, WarningCircle } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos, Cifra, SinLaMigracion, TituloDeBloque } from '@/components/finanzas/piezas';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { explicar } from '@/components/finanzas/TasasDeUsura';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type {
  DeterioroDelMes,
  EstadoDeLaProvision,
  TramoCalculado,
} from '@/lib/api/finanzas.types';
import {
  hayCambios,
  movimientoDelMes,
  porcentajesFueraDeRango,
  queSeAsienta,
  recalcularTramos,
  totalProvisionado,
  tramosParaGuardar,
} from '@/lib/finanzas/deterioro';
import { mesActual } from '@/lib/recaudo/meses';
import { formatCurrency } from '@/lib/types/inmobiliaria';

const NUMERO = new Intl.NumberFormat('es-CO');

const TONO_DEL_ESTADO: Record<EstadoDeLaProvision, 'warning' | 'success' | 'secondary'> = {
  PROPUESTA: 'warning',
  APROBADA: 'success',
  ANULADA: 'secondary',
};

const NOMBRE_DEL_ESTADO: Record<EstadoDeLaProvision, string> = {
  PROPUESTA: 'Propuesta, sin asentar',
  APROBADA: 'Aprobada y asentada',
  ANULADA: 'Anulada',
};

/** «0 a 90 días» / «180+ días» — el rango del tramo en días de mora. */
export function rangoEnDias(tramo: { desdeDias: number; hastaDias: number | null }): string {
  return tramo.hastaDias === null
    ? `${tramo.desdeDias}+ días`
    : `${tramo.desdeDias} a ${tramo.hastaDias} días`;
}

export function DeterioroDeCarteraPanel() {
  const [mes, setMes] = useState(() => mesActual());
  const [datos, setDatos] = useState<DeterioroDelMes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  /** Lo que el contador escribió, por nombre de tramo. Vacío = lo del back. */
  const [porcentajes, setPorcentajes] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState<'aprobar' | 'anular' | null>(null);
  const [motivo, setMotivo] = useState('');
  /**
   * 🔴 La propuso y la aprobó la misma persona (lo dice el back al aprobar).
   * No bloquea —en una inmobiliaria chica el contador es uno solo— pero se
   * dice: un control que no se aplicó y que nadie ve es peor que no tenerlo.
   */
  const [mismoAprobador, setMismoAprobador] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await finanzasApi.deterioro(mes);
      setDatos(r);
      setPorcentajes({});
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    setPorcentajes({});
    setMismoAprobador(false);
    finanzasApi
      .deterioro(mes)
      .then((r) => {
        if (vivo) setDatos(r);
      })
      .catch((e) => {
        if (vivo) setError(e);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [mes]);

  const tramos: TramoCalculado[] = useMemo(
    () => recalcularTramos(datos?.calculo.tramos ?? [], porcentajes),
    [datos, porcentajes],
  );
  const provisionCop = totalProvisionado(tramos);
  const anteriorCop = datos?.provision?.provisionAnteriorCop ?? datos?.anterior?.provisionCop ?? 0;
  const movimiento = movimientoDelMes(provisionCop, anteriorCop);
  const fuera = porcentajesFueraDeRango(tramos);
  const cambiado = hayCambios(datos?.calculo.tramos ?? [], porcentajes);
  const provision = datos?.provision ?? null;
  const disponible = datos?.disponible !== false;
  const aprobada = provision?.estado === 'APROBADA';

  async function proponer() {
    setEnviando(true);
    try {
      await finanzasApi.proponerDeterioro({ mes, tramos: tramosParaGuardar(tramos) });
      toast.success('Provisión propuesta.', {
        description: 'Todavía no se asienta nada: falta aprobarla.',
      });
      await cargar();
    } catch (e) {
      toast.error('No se pudo proponer la provisión.', {
        description: explicar(e, 'No se pudo proponer la provisión.'),
      });
    } finally {
      setEnviando(false);
    }
  }

  async function aprobar() {
    if (!provision) return;
    setEnviando(true);
    try {
      const r = await finanzasApi.aprobarDeterioro(provision.id);
      setMismoAprobador(r.mismoAprobador === true);
      toast.success('Provisión aprobada.', {
        description: r.mismoAprobador
          ? 'El movimiento del mes quedó asentado. La propusiste y la aprobaste tú: no hubo segundo par de ojos.'
          : 'El movimiento del mes quedó asentado.',
      });
      setConfirmando(null);
      await cargar();
    } catch (e) {
      toast.error('No se pudo aprobar.', { description: explicar(e, 'No se pudo aprobar.') });
    } finally {
      setEnviando(false);
    }
  }

  async function anular() {
    if (!provision) return;
    setEnviando(true);
    try {
      await finanzasApi.anularDeterioro(provision.id, motivo.trim());
      toast.success('Provisión anulada.');
      setConfirmando(null);
      setMotivo('');
      await cargar();
    } catch (e) {
      toast.error('No se pudo anular.', { description: explicar(e, 'No se pudo anular.') });
    } finally {
      setEnviando(false);
    }
  }

  return (
    /* 🔴 20-09 · Nico, sobre esta pantalla: «no tiene la tabla como la usamos
       nosotros». Eran cinco bloques sueltos flotando en el aire —el mes, los
       avisos, las cuatro cifras, la tabla y los tres botones—, cada uno con su
       propio borde o sin ninguno. Ahora es UNA tarjeta, el chasis de la casa:
       el mes y el estado arriba con `border-b`, el resumen, la tabla, y las
       acciones en el pie. Los bordes separan; el aire no. */
    <section
      className="overflow-x-clip rounded-lg border border-border bg-surface"
      data-testid="deterioro-de-cartera"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SelectorDeMes mes={mes} onCambiar={setMes} />
        {provision ? (
          <Badge variant={TONO_DEL_ESTADO[provision.estado]} data-testid="estado-de-la-provision">
            {NOMBRE_DEL_ESTADO[provision.estado]}
          </Badge>
        ) : (
          <Badge variant="secondary" data-testid="estado-de-la-provision">
            Sin proponer
          </Badge>
        )}
      </div>

      {mismoAprobador ? (
        <p
          className="border-b border-border bg-warning-soft px-4 py-3 text-sm text-fg"
          data-testid="mismo-aprobador"
          role="status"
        >
          Esta provisión la propusiste y la aprobaste tú: no hubo un segundo par de ojos. No está
          prohibido —en una inmobiliaria chica el contador es una sola persona— pero queda dicho, y
          el asiento ya está hecho.
        </p>
      ) : null}

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        queEs="el deterioro de cartera"
        onReintentar={cargar}
        conservarContenido={Boolean(datos)}
      >
        {datos ? (
          <div className="space-y-6 p-4">
            {!datos.disponible ? (
              <SinLaMigracion motivo={datos.motivo} queSeEspera="guardar la provisión del mes" />
            ) : null}

            <Avisos
              avisos={datos.calculo.avisos}
              testId="avisos-del-deterioro"
              titulo="Lo que el contador tiene que decidir antes de aprobar"
            />

            {/* ── 🔴 El movimiento, que es lo que se asienta ─────────────── */}
            <section className="space-y-3">
              <TituloDeBloque
                titulo="Lo que se asienta este mes"
                explicacion="La provisión es un saldo acumulado. Al libro va la DIFERENCIA con la del mes anterior: asentar el saldo entero cada mes lo duplicaría."
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Cifra
                  id="movimiento"
                  etiqueta="Movimiento del mes"
                  valor={movimiento}
                  definicion={queSeAsienta(movimiento)}
                  tono={movimiento > 0 ? 'danger' : movimiento < 0 ? 'success' : undefined}
                />
                <Cifra
                  id="provision"
                  etiqueta="Provisión al cierre"
                  valor={provisionCop}
                  definicion="El saldo acumulado que queda en la cuenta correctora después de este mes. NO es lo que se asienta."
                />
                <Cifra
                  id="provision-anterior"
                  etiqueta="Provisión del mes anterior"
                  valor={anteriorCop}
                  definicion="La última aprobada. Es el punto de partida del movimiento."
                />
                <Cifra
                  id="cartera-provisionable"
                  etiqueta="Cartera provisionable"
                  valor={datos.calculo.carteraCop}
                  definicion={`Sólo el CAPITAL en cartera viva: ${NUMERO.format(datos.calculo.cuotas)} cuotas. Lo que está en siniestro y el interés de mora quedan fuera.`}
                />
              </div>
            </section>

            {/* ── Los tramos, editables ─────────────────────────────────── */}
            <section className="space-y-3">
              <TituloDeBloque
                titulo="Provisión por edades"
                explicacion="El porcentaje de cada tramo es una SUGERENCIA del sistema; el que manda es el que dejes acá. La provisión se recalcula mientras escribes: lo que se guarda son los porcentajes, no los pesos."
              />
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tramo</TableHead>
                        <TableHead>Días de mora</TableHead>
                        <TableHead className="text-right">Cartera</TableHead>
                        <TableHead className="text-right">Cuotas</TableHead>
                        <TableHead className="text-right">% a provisionar</TableHead>
                        <TableHead className="text-right">Sugerido</TableHead>
                        <TableHead className="text-right">Provisión</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tramos.map((t) => (
                        <TableRow key={t.nombre} data-testid={`tramo-${t.desdeDias}`}>
                          <TableCell className="font-medium text-fg">{t.nombre}</TableCell>
                          <TableCell className="text-fg-muted">{rangoEnDias(t)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(t.carteraCop)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {NUMERO.format(t.cuotas)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              aria-label={`Porcentaje de ${t.nombre}`}
                              data-testid={`porcentaje-${t.desdeDias}`}
                              inputMode="decimal"
                              className="ml-auto w-24 text-right font-mono"
                              disabled={aprobada || !disponible}
                              value={String(t.porcentaje)}
                              onChange={(e) => {
                                const valor = Number(e.target.value.replace(',', '.'));
                                setPorcentajes((p) => ({
                                  ...p,
                                  [t.nombre]: Number.isFinite(valor) ? valor : 0,
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-fg-muted">
                            {t.porcentajeSugerido} %
                          </TableCell>
                          <TableCell
                            className="text-right font-mono tabular-nums"
                            data-testid={`provision-${t.desdeDias}`}
                          >
                            {formatCurrency(t.provisionCop)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={6} className="font-medium">
                          Total provisionado
                        </TableCell>
                        <TableCell
                          className="text-right font-mono tabular-nums"
                          data-testid="total-provisionado"
                        >
                          {formatCurrency(provisionCop)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>

              {fuera.length > 0 ? (
                <p className="flex items-center gap-2 text-sm text-danger" data-testid="porcentaje-invalido">
                  <WarningCircle className="h-4 w-4" aria-hidden="true" />
                  Un porcentaje de provisión va entre 0 y 100: revisa {fuera.join(', ')}.
                </p>
              ) : null}

              {datos.calculo.sinTramoCop > 0 ? (
                <p className="text-sm text-warning" data-testid="cartera-sin-tramo">
                  {formatCurrency(datos.calculo.sinTramoCop)} de cartera no cayó en ningún tramo y no
                  se provisionó: los rangos tienen un hueco.
                </p>
              ) : null}

              <p className="text-xs text-fg-muted">
                En siniestro: {formatCurrency(datos.calculo.enSiniestroCop)} en{' '}
                {NUMERO.format(datos.calculo.cuotasEnSiniestro)} cuotas, fuera de esta provisión. Su
                deterioro depende de la póliza, no de la edad de la cuota.
              </p>
            </section>

            {/* ── Las tres acciones, en el PIE de la tarjeta ──────────────
                No flotando debajo: son las acciones de ESTA provisión, no de
                la pantalla, y separadas por aire se leían como otra cosa. */}
            <div className="-mx-4 -mb-4 flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
              <Button
                hideArrow
                disabled={!disponible || aprobada || fuera.length > 0}
                isLoading={enviando && confirmando === null}
                onClick={() => void proponer()}
                data-testid="proponer"
              >
                {provision && !aprobada ? 'Volver a proponer' : 'Proponer'}
              </Button>
              <Button
                variant="secondary"
                hideArrow
                disabled={!disponible || !provision || provision.estado !== 'PROPUESTA'}
                onClick={() => setConfirmando('aprobar')}
                data-testid="aprobar"
              >
                <CheckCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                Aprobar y asentar
              </Button>
              <Button
                variant="outline"
                hideArrow
                disabled={!disponible || !provision || provision.estado === 'ANULADA'}
                onClick={() => setConfirmando('anular')}
                data-testid="anular"
              >
                <Prohibit className="mr-1 h-4 w-4" aria-hidden="true" />
                Anular
              </Button>
              {cambiado ? (
                <span className="text-xs text-warning" data-testid="hay-cambios-sin-guardar">
                  Cambiaste porcentajes y todavía no los propusiste: lo que se ve acá no es lo que
                  está guardado.
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </EstadoDeDatos>

      {/* ── Aprobar: se repite el número antes del clic ─────────────────── */}
      <Dialog
        open={confirmando === 'aprobar'}
        onOpenChange={(o) => !o && setConfirmando(null)}
      >
        <DialogContent className="max-w-md" data-testid="dialogo-aprobar-deterioro">
          <DialogHeader>
            <DialogTitle>Aprobar la provisión</DialogTitle>
            <DialogDescription>
              Se asienta el MOVIMIENTO del mes, no el saldo de la provisión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-fg">
            <p className="font-mono text-xl tabular-nums" data-testid="movimiento-a-asentar">
              {formatCurrency(provision?.movimientoCop ?? movimiento)}
            </p>
            <p className="text-fg-muted">{queSeAsienta(provision?.movimientoCop ?? movimiento)}</p>
            <p className="text-fg-muted">
              Después de aprobarla, el saldo de la provisión queda en{' '}
              {formatCurrency(provision?.provisionCop ?? provisionCop)}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" hideArrow onClick={() => setConfirmando(null)} disabled={enviando}>
              Cancelar
            </Button>
            <Button hideArrow onClick={() => void aprobar()} isLoading={enviando}>
              Aprobar y asentar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Anular: con motivo, siempre ────────────────────────────────── */}
      <Dialog open={confirmando === 'anular'} onOpenChange={(o) => !o && setConfirmando(null)}>
        <DialogContent className="max-w-md" data-testid="dialogo-anular-deterioro">
          <DialogHeader>
            <DialogTitle>Anular la provisión</DialogTitle>
            <DialogDescription>
              Un asiento no se borra: se reversa, y la reversa lleva motivo. Queda en el libro.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Motivo de la anulación"
            data-testid="motivo-de-la-anulacion"
            rows={3}
            placeholder="La cartera de septiembre se recalculó después de cargar los pagos del 30."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" hideArrow onClick={() => setConfirmando(null)} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              hideArrow
              onClick={() => void anular()}
              disabled={motivo.trim().length < 5}
              isLoading={enviando}
            >
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
