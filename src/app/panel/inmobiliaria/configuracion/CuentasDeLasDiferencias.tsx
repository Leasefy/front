'use client';

/**
 * 🔴 Las CUENTAS de las diferencias de la conciliación (Nico, P1, 03-10-2026):
 * «asiento AUTOMÁTICO al aprobar, contra cuentas configurables por
 * inmobiliaria. La retención del inquilino queda a nombre del PROPIETARIO
 * (art. 394 ET) y entra en su liquidación y certificado». Encargo: «4×1000 y
 * comisión → gasto bancario».
 *
 * Tres cuentas del plan de la inmobiliaria (la semilla propone 530505 para los
 * gastos bancarios y 28150505 para la retención). Sin cuenta, la diferencia
 * aprobada NO se asienta (nunca a una cuenta adivinada) y queda «por
 * asentar»: el botón la asienta cuando ya hay cuenta.
 *
 * 🔴 ARREGLOS-6b (Nico, ARREGLOS-5 Q2 a): una cuarta, el ANTICIPO DE IMPUESTOS
 * (la semilla propone 135515), para las retenciones que la pasarela le practica
 * a la inmobiliaria en el giro de Leasefy. Necesita su propia migración del
 * back: sin ella, esa fila se ve pero no se guarda (`disponible: false`).
 *
 * 🔴 Seguimiento 6 («"Asentarlas" no reprocesaba las salidas»): «por asentar»
 * cuenta también el 4×1000 y las comisiones conciliados como salida, y los
 * gastos del banco del extracto que las reglas de las salidas reconocen
 * seguros y siguen sin conciliar se ofrecen en el mismo clic: el diálogo dice
 * cuántos y cuánto, y sólo se concilian si la persona lo deja marcado.
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bank, Warning } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import { SelectorDeCuenta } from '@/components/contabilidad/SelectorDeCuenta';
import { useCuentas } from '@/components/contabilidad/use-cuentas';
import { usePuedeEscribir } from '@/components/contabilidad/use-puede-escribir';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useAparecer } from '@/components/cobros/extracto-bancario/cuentas-del-extracto';
import { diaLegible } from '@/components/cobros/extracto-bancario/formato';
import {
  cuentasDeLasDiferenciasApi,
  type CuentasDeLasDiferencias as Datos,
  type DiferenciasPorAsentar,
  type EventoDeDiferencia,
  type ResultadoDelReproceso,
} from '@/lib/api/cuentas-de-las-diferencias';
import { EsqueletoDeSeccion } from './piezas';
import { ESPACIO_DE_LA_PLATA, decimalesEnPantalla, seMuestranLosCentavos } from '@/lib/plata/escribir-plata';

/** P8 a («centavos en todo»): los centavos sólo si los hay (el 4×1000 los trae, P4 a). CE-01 (QA-PAGOS-95 r2): «$ » con espacio duro. */
function plata(cop: number): string {
  return seMuestranLosCentavos(cop)
    ? `$${ESPACIO_DE_LA_PLATA}${cop.toLocaleString('es-CO', decimalesEnPantalla(cop))}`
    : `$${ESPACIO_DE_LA_PLATA}${Math.round(cop).toLocaleString('es-CO')}`;
}

/** Lo que dice el toast después de «Asentarlas» (seguimiento 6). */
export function frasesDelReproceso(r: ResultadoDelReproceso): { bien: string[]; mal: string[] } {
  const bien: string[] = [];
  const mal: string[] = [];
  const g = r.gastosDelBanco;
  if (g && g.conciliados > 0) {
    bien.push(
      g.conciliados === 1
        ? `Se concilió 1 gasto del banco del extracto (${plata(g.totalCop)}).`
        : `Se conciliaron ${g.conciliados} gastos del banco del extracto (${plata(g.totalCop)}).`,
    );
  }
  if (g && g.yaNoSonSeguros > 0) {
    mal.push(
      g.yaNoSonSeguros === 1
        ? '1 gasto del banco ya no era seguro: sigue pendiente en el extracto.'
        : `${g.yaNoSonSeguros} gastos del banco ya no eran seguros: siguen pendientes en el extracto.`,
    );
  }
  if (r.asentadas > 0) {
    bien.push(r.asentadas === 1 ? 'Se asentó 1 diferencia.' : `Se asentaron ${r.asentadas} diferencias.`);
  }
  if (r.sinAsentar > 0 || (r.motivos.length > 0 && r.asentadas === 0 && !(g && g.conciliados > 0))) {
    const cuantas =
      r.sinAsentar > 0 ? (r.sinAsentar === 1 ? 'Quedó 1 sin asentar' : `Quedaron ${r.sinAsentar} sin asentar`) : 'No se pudo';
    mal.push(`${cuantas}: ${r.motivos.join(' · ')}`);
  }
  return { bien, mal };
}

export function CuentasDeLasDiferencias() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [porAsentar, setPorAsentar] = useState<DiferenciasPorAsentar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState<EventoDeDiferencia | null>(null);
  const [asentando, setAsentando] = useState(false);
  /** El diálogo de «Asentarlas» cuando hay gastos del banco del extracto que ofrecer. */
  const [confirmando, setConfirmando] = useState(false);
  const [conciliarLosGastos, setConciliarLosGastos] = useState(true);
  const { cuentas } = useCuentas();
  const escritura = usePuedeEscribir();
  const aparecer = useAparecer();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [d, p] = await Promise.all([
        cuentasDeLasDiferenciasApi.cuentas(),
        cuentasDeLasDiferenciasApi.porAsentar().catch(() => null),
      ]);
      setDatos(d);
      setPorAsentar(p);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function elegir(evento: EventoDeDiferencia, cuentaId: string | null) {
    setGuardando(evento);
    try {
      const r = await cuentasDeLasDiferenciasApi.guardar([{ evento, cuentaId }]);
      setDatos(r);
      toast.success(cuentaId ? 'Cuenta guardada.' : 'Cuenta quitada: esa diferencia no se asienta hasta que elijas otra.');
      setPorAsentar(await cuentasDeLasDiferenciasApi.porAsentar().catch(() => null));
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar la cuenta.',
          accion: 'guardar la cuenta de la diferencia',
        }),
      );
    } finally {
      setGuardando(null);
    }
  }

  const gastos = porAsentar?.gastosDelExtracto ?? null;
  const hayGastos = !!gastos && gastos.cantidad > 0;

  /** Con gastos del banco que ofrecer, primero el diálogo; si no, asienta de una. */
  function alApretarAsentarlas() {
    if (hayGastos) {
      setConciliarLosGastos(gastos!.puedeConciliar);
      setConfirmando(true);
      return;
    }
    void asentarLasPendientes(false);
  }

  async function asentarLasPendientes(conLosGastos: boolean) {
    setAsentando(true);
    try {
      const r = await cuentasDeLasDiferenciasApi.reprocesar(
        conLosGastos && gastos && gastos.puedeConciliar ? gastos : null,
      );
      const { bien, mal } = frasesDelReproceso(r);
      if (bien.length > 0) toast.success(bien.join(' '));
      if (mal.length > 0) toast.error(mal.join(' '));
      setConfirmando(false);
      setPorAsentar(await cuentasDeLasDiferenciasApi.porAsentar().catch(() => null));
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudieron asentar las diferencias.',
          accion: 'asentar las diferencias',
        }),
      );
    } finally {
      setAsentando(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-5"
      aria-labelledby="cuentas-de-las-diferencias-titulo"
      data-testid="cuentas-de-las-diferencias"
    >
      <header className="space-y-1">
        <h3 id="cuentas-de-las-diferencias-titulo" className="flex items-center gap-2 text-base font-semibold text-fg">
          <Bank className="h-4 w-4" aria-hidden="true" />
          Cuentas de las diferencias
        </h3>
        <p className="text-body-sm text-fg-muted">
          Cuando apruebas una conciliación con una diferencia, se asienta sola: el 4×1000 y la comisión van a gasto
          bancario; la retención que practicó el inquilino queda a nombre del propietario (art. 394 del Estatuto
          Tributario), se le descuenta en su liquidación y entra a su certificado. Las retenciones que te practica la
          pasarela en el giro de Leasefy van al anticipo de impuestos.
        </p>
      </header>

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        vacio={false}
        queEs="las cuentas de las diferencias"
        onReintentar={cargar}
        esqueleto={<EsqueletoDeSeccion filas={3} />}
      >
        {datos ? (
          <div className="space-y-4">
            {!datos.disponible && (
              <SinLaMigracion
                motivo={datos.motivo}
                queSeEspera="guardar las cuentas y asentar las diferencias"
                testId="cuentas-de-las-diferencias-sin-la-migracion"
              />
            )}

            <ul className="space-y-3" aria-label="Cuenta de cada diferencia">
              {datos.eventos.map((e) => (
                <li
                  key={e.evento}
                  className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-md border border-border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start"
                  data-testid={`cuenta-de-${e.evento}`}
                >
                  <div className="space-y-1">
                    <Label htmlFor={`cuenta-${e.evento}`}>{e.nombre}</Label>
                    <p className="text-caption text-fg-muted">{e.explicacion}</p>
                  </div>
                  <div className="space-y-1.5">
                    <SelectorDeCuenta
                      cuentas={cuentas}
                      value={e.cuenta?.id ?? ''}
                      onChange={(id) => void elegir(e.evento, id || null)}
                      soloImputables
                      disabled={
                        !datos.disponible || e.disponible === false || guardando === e.evento || !escritura.puede
                      }
                      placeholder="Sin cuenta: no se asienta"
                      className="w-full"
                    />
                    {/* ARREGLOS-6b: la cuenta del anticipo sin su migración del back: se ve, no se guarda. */}
                    {datos.disponible && e.disponible === false && e.motivo && (
                      <p className="text-caption text-fg-muted" data-testid={`sin-guardar-${e.evento}`}>
                        {e.motivo}
                      </p>
                    )}
                    {!e.cuenta && e.propuesta && datos.disponible && e.disponible !== false && (
                      <Button
                        size="sm"
                        variant="ghost"
                        hideArrow
                        disabled={guardando === e.evento || !escritura.puede}
                        onClick={() => void elegir(e.evento, e.propuesta!.id)}
                        data-testid={`usar-propuesta-${e.evento}`}
                      >
                        Usar {e.propuesta.codigo} · {e.propuesta.nombre}
                      </Button>
                    )}
                    {!escritura.puede && escritura.motivo && (
                      <p className="text-caption text-fg-muted">{escritura.motivo}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-caption text-fg-muted" data-testid="cuenta-del-banco">
              {datos.cuentaDelBanco
                ? `Lo que no llegó sale de ${datos.cuentaDelBanco.codigo} · ${datos.cuentaDelBanco.nombre} (la cuenta de «Entró plata al banco» del mapeo contable).`
                : 'Falta la cuenta de «Entró plata al banco» en el mapeo contable: sin ella no se asienta ninguna diferencia.'}
            </p>

            {!datos.retencionEnLaLiquidacion && datos.disponible && (
              <p className="flex items-start gap-2 text-caption text-fg-muted" data-testid="retencion-sin-liquidacion">
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                La retención se asienta a nombre del propietario y entra a su certificado, pero todavía no se le
                descuenta sola en la liquidación: falta preparar eso en el servidor.
              </p>
            )}

            <AnimatePresence initial={false}>
              {porAsentar && (porAsentar.total > 0 || hayGastos) && (
                <motion.div
                  key="por-asentar"
                  {...aparecer}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning bg-warning-soft px-4 py-3"
                  data-testid="diferencias-por-asentar"
                >
                  <div className="space-y-1">
                    {porAsentar.total > 0 && (
                      <p className="text-body-sm text-fg">
                        {porAsentar.total === 1
                          ? `1 diferencia aprobada (${plata(porAsentar.valorCop)}) no tiene asiento todavía.`
                          : `${porAsentar.total} diferencias aprobadas (${plata(porAsentar.valorCop)}) no tienen asiento todavía.`}
                        {(porAsentar.deLasSalidas?.total ?? 0) > 0 &&
                          (porAsentar.deLasSalidas!.total === porAsentar.total
                            ? ' Son gastos del banco conciliados como salidas (4×1000 y comisiones).'
                            : ` ${porAsentar.deLasSalidas!.total} son gastos del banco conciliados como salidas (4×1000 y comisiones).`)}
                      </p>
                    )}
                    {hayGastos && (
                      <p className="text-body-sm text-fg" data-testid="gastos-del-extracto">
                        {gastos!.cantidad === 1
                          ? `En el extracto hay 1 gasto del banco (${plata(gastos!.totalCop)}) que se reconoce solo y sigue sin conciliar.`
                          : `En el extracto hay ${gastos!.cantidad} gastos del banco (${plata(gastos!.totalCop)}) que se reconocen solos y siguen sin conciliar.`}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    hideArrow
                    isLoading={asentando}
                    disabled={!escritura.puede || !datos.disponible}
                    onClick={alApretarAsentarlas}
                    data-testid="asentar-las-pendientes"
                  >
                    Asentarlas
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Dialog open={confirmando} onOpenChange={(v) => !v && !asentando && setConfirmando(false)}>
              <DialogContent variant="confirm" icon={<Bank weight="bold" />} data-testid="dialogo-asentarlas">
                <DialogHeader>
                  <DialogTitle>Asentar lo que falta</DialogTitle>
                  <DialogDescription>
                    {porAsentar && porAsentar.total > 0
                      ? porAsentar.total === 1
                        ? `Se asienta 1 diferencia aprobada (${plata(porAsentar.valorCop)}).`
                        : `Se asientan ${porAsentar.total} diferencias aprobadas (${plata(porAsentar.valorCop)}).`
                      : 'No hay diferencias aprobadas sin asiento.'}
                  </DialogDescription>
                </DialogHeader>
                {gastos && hayGastos && (
                  <div className="space-y-2">
                    {gastos.puedeConciliar ? (
                      <label className="flex items-start gap-2 text-body-sm text-fg">
                        <Checkbox
                          checked={conciliarLosGastos}
                          onCheckedChange={(v) => setConciliarLosGastos(v === true)}
                          data-testid="conciliar-los-gastos"
                        />
                        <span>
                          También conciliar {gastos.cantidad === 1 ? 'el gasto del banco' : `los ${gastos.cantidad} gastos del banco`}{' '}
                          del extracto ({plata(gastos.totalCop)}) y asentarlos. Sólo los que siguen siendo seguros: el
                          4×1000 y las comisiones que el banco escribe con su nombre.
                        </span>
                      </label>
                    ) : (
                      <p className="text-body-sm text-fg-muted" data-testid="gastos-sin-permiso">
                        {gastos.porQueNo ?? 'No puedes conciliar los gastos del banco del extracto.'}
                      </p>
                    )}
                    <ul
                      className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2"
                      aria-label="Los gastos del banco del extracto"
                    >
                      {gastos.salidas.map((g) => (
                        <li key={g.movimientoId} className="flex items-start justify-between gap-3 text-body-sm">
                          <span className="min-w-0">
                            <span className="block truncate text-fg" title={g.descripcion}>
                              {g.descripcion}
                            </span>
                            <span className="block text-caption text-fg-muted">
                              {diaLegible(g.fecha)} · {g.etiqueta}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-fg">{plata(g.valorCop)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="ghost" hideArrow onClick={() => setConfirmando(false)} disabled={asentando}>
                    Cancelar
                  </Button>
                  <Button
                    hideArrow
                    isLoading={asentando}
                    disabled={!(porAsentar && porAsentar.total > 0) && !(conciliarLosGastos && gastos?.puedeConciliar)}
                    onClick={() => void asentarLasPendientes(conciliarLosGastos)}
                    data-testid="confirmar-asentarlas"
                  >
                    {conciliarLosGastos && gastos?.puedeConciliar ? 'Conciliar y asentar' : 'Asentar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </EstadoDeDatos>
    </section>
  );
}
