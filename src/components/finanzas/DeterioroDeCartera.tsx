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
import { Avisos, SinLaMigracion } from '@/components/finanzas/piezas';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
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
// CB-17: la plata de Contabilidad con UN formato («$ 1.234.567», «−$ 119.100»).
import { plata as formatCurrency } from '@/lib/contabilidad/plata';
import { cifrasDeLaPantalla } from '@/lib/i18n/idioma-de-las-cifras';

const NUMERO = cifrasDeLaPantalla();

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

/**
 * «De 0 a 90 días» / «De 91 a 180 días» / «Más de 180 días» — el rango del
 * tramo en días de mora (con los tramos del back 26beefbc: 0–91, 91–181, 181+).
 *
 * 🔴 CB-08 (QA de Contabilidad, 03-10-2026): decía «0 a 90» y «90 a 180»: dos
 * tramos compartían el 90. El back cuenta una cuota en el tramo cuando
 * `desdeDias <= días < hastaDias` (`deterioro-de-cartera.ts`), así que el
 * último día de un tramo es `hastaDias − 1`: la cuota de 90 días cae en el
 * segundo, y el rótulo lo dice.
 */
export function rangoEnDias(tramo: { desdeDias: number; hastaDias: number | null }): string {
  if (tramo.hastaDias === null) {
    return tramo.desdeDias > 0 ? `Más de ${tramo.desdeDias - 1} días` : 'Cualquier mora';
  }
  const ultimo = tramo.hastaDias - 1;
  return ultimo <= tramo.desdeDias
    ? `${tramo.desdeDias} días`
    : `De ${tramo.desdeDias} a ${ultimo} días`;
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
  const lePasaAAprobar = provision?.estado === 'PROPUESTA' && !cambiado;

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
      setMismoAprobador(false);
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

      {/* 🔴 CB-31 (QA de Contabilidad, 03-10-2026): sólo con una provisión
          APROBADA. Después de anularla el aviso quedaba pegado sobre
          «Sin proponer», hablando de algo que ya no existía. */}
      {mismoAprobador && aprobada ? (
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

            {/* ── 🔴 LA RESPUESTA: el movimiento, que es lo que se asienta ────────
                GLOW UP 3.ª vuelta · antes eran cuatro cifras del mismo peso; la que
                contesta la pantalla es una, y la provisión de antes y de después
                son su contexto. Lo que mide cada una, plegado al pie. */}
            <CifraHeroe
              rotulo="Se asienta este mes"
              cifra={<span data-testid="valor-movimiento">{formatCurrency(movimiento)}</span>}
              contexto={
                <>
                  la provisión pasa de{' '}
                  <span className="font-mono tabular-nums" data-testid="valor-provision-anterior">{formatCurrency(anteriorCop)}</span>{' '}
                  a <span className="font-mono tabular-nums" data-testid="valor-provision">{formatCurrency(provisionCop)}</span>
                </>
              }
              pie={
                <>
                  {queSeAsienta(movimiento)} Cartera provisionable:{' '}
                  <span className="font-mono tabular-nums" data-testid="valor-cartera-provisionable">{formatCurrency(datos.calculo.carteraCop)}</span>{' '}
                  en {NUMERO.format(datos.calculo.cuotas)} cuotas.
                </>
              }
              // C3 (revisora r25): sin provisión antes ni ahora, UNA línea y no tres cifras en cero.
              esCero={movimiento === 0 && provisionCop === 0 && anteriorCop === 0}
              data-testid="cifra-movimiento"
            />

            {/* ── Los tramos, editables ─────────────────────────────────── */}
            <section className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-[17px] font-[460] tracking-[-0.01em] text-fg">Provisión por edades</h2>
                <p className="text-body-sm text-fg-muted">
                  El porcentaje de cada tramo es una sugerencia: el que manda es el que dejes aquí.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                  <Table className="max-md:block">
                    <TableHeader className="max-md:hidden">
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
                    <TableBody className="max-md:block">
                      {tramos.map((t) => (
                        <TableRow
                          key={t.nombre}
                          data-testid={`tramo-${t.desdeDias}`}
                          className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3.5 max-md:last:border-0"
                        >
                          <TableCell className="text-fg max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">{t.nombre}</TableCell>
                          <TableCell className="text-fg-muted max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption">{rangoEnDias(t)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-left max-md:text-caption max-md:text-fg-muted">
                            {formatCurrency(t.carteraCop)}
                            <span className="md:hidden"> en {NUMERO.format(t.cuotas)} cuotas</span>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                            {NUMERO.format(t.cuotas)}
                          </TableCell>
                          <TableCell className="text-right max-md:col-start-2 max-md:row-span-2 max-md:row-start-2 max-md:block max-md:p-0">
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
                          <TableCell className="text-right font-mono tabular-nums text-fg-muted max-md:hidden">
                            {t.porcentajeSugerido} %
                          </TableCell>
                          <TableCell
                            className="text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0"
                            data-testid={`provision-${t.desdeDias}`}
                          >
                            {formatCurrency(t.provisionCop)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter className="max-md:block">
                      <TableRow className="max-md:flex max-md:items-center max-md:justify-between max-md:px-4 max-md:py-3">
                        <TableCell colSpan={6} className="font-medium max-md:block max-md:p-0">
                          Total provisionado
                        </TableCell>
                        <TableCell
                          className="text-right font-mono tabular-nums max-md:block max-md:p-0"
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

              <p className="text-caption text-fg-muted">
                En siniestro: {formatCurrency(datos.calculo.enSiniestroCop)} en{' '}
                {NUMERO.format(datos.calculo.cuotasEnSiniestro)} cuotas, fuera de esta provisión. Su
                deterioro depende de la póliza, no de la edad de la cuota.
              </p>
            </section>

            {/* Lo que se consulta: qué mide cada cifra. */}
            <MasDetalles etiqueta="Qué mide cada cifra" etiquetaAbierto="Ocultar qué mide cada cifra" montadoSiempre>
              <div className="max-w-2xl space-y-2 text-body-sm leading-relaxed text-fg-muted">
                <p>
                  La provisión es un saldo acumulado. Al libro va la DIFERENCIA con la del mes anterior:
                  asentar el saldo entero cada mes lo duplicaría.
                </p>
                <p data-testid="cifra-provision">
                  <span className="text-fg">Provisión al cierre</span>: el saldo acumulado que queda en la
                  cuenta correctora después de este mes. NO es lo que se asienta.
                </p>
                <p>
                  <span className="text-fg">Provisión del mes anterior</span>: la última aprobada. Es el
                  punto de partida del movimiento.
                </p>
                <p>
                  <span className="text-fg">Cartera provisionable</span>: sólo el capital en cartera viva.
                  Lo que está en siniestro y el interés de mora quedan fuera.
                </p>
                <p>
                  Lo que se guarda son los porcentajes, no los pesos: la provisión se recalcula mientras
                  escribes.
                </p>
              </div>
            </MasDetalles>

            {/* ── Las tres acciones, en el PIE de la tarjeta ──────────────
                No flotando debajo: son las acciones de ESTA provisión, no de
                la pantalla, y separadas por aire se leían como otra cosa. */}
            <div className="-mx-4 -mb-4 flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
              {/* Un solo azul, en el paso que sigue: con una propuesta guardada y sin cambios,
                  lo que sigue es aprobarla; si no, proponer. */}
              <Button
                size="sm"
                variant={lePasaAAprobar ? 'outline' : 'default'}
                hideArrow
                disabled={!disponible || aprobada || fuera.length > 0}
                isLoading={enviando && confirmando === null}
                onClick={() => void proponer()}
                data-testid="proponer"
              >
                {provision && !aprobada ? 'Volver a proponer' : 'Proponer'}
              </Button>
              <Button
                size="sm"
                variant={lePasaAAprobar ? 'default' : 'outline'}
                hideArrow
                disabled={!disponible || !provision || provision.estado !== 'PROPUESTA'}
                onClick={() => setConfirmando('aprobar')}
                data-testid="aprobar"
              >
                <CheckCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                Aprobar y asentar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                hideArrow
                disabled={!disponible || !provision || provision.estado === 'ANULADA'}
                onClick={() => setConfirmando('anular')}
                data-testid="anular"
              >
                <Prohibit className="mr-1 h-4 w-4" aria-hidden="true" />
                Anular
              </Button>
              {cambiado ? (
                <span className="text-caption text-warning" data-testid="hay-cambios-sin-guardar">
                  Cambiaste porcentajes y todavía no los propusiste: lo que se ve aquí no es lo que
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
        <DialogContent
          size="sm"
          variant="confirm"
          icon={<CheckCircle weight="bold" />}
          data-testid="dialogo-aprobar-deterioro"
        >
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
        {/* Destructiva: no borra (reversa), pero deja sin efecto la provisión. */}
        <DialogContent
          size="sm"
          variant="destructive"
          icon={<Prohibit weight="bold" />}
          data-testid="dialogo-anular-deterioro"
        >
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
              variant="destructive"
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
