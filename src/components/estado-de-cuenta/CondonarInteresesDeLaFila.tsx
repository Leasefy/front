'use client';

/**
 * «Condonar intereses» sobre la fila de interés de mora del estado de cuenta —
 * B-13 (QA-PAGOS-95 ronda 2; Nico, 05-10-2026, TAL CUAL).
 *
 * · Sólo en el PANEL y sólo para un ADMINISTRADOR (CEO: «un administrador, con
 *   motivo, total o parcial por cuota»). Llega por contexto, como «Anular
 *   recibo»: el mismo documento se monta en los portales y en el enlace
 *   público, y ahí no se pinta nada.
 * · Por concepto: «Interés de mora» y «Gasto de cobranza», cada uno hasta lo
 *   que la cuota debe HOY (lo pagado ya está facturado). «Condonar el total»
 *   llena los dos.
 * · Qué hace «Total» lo decide cada inmobiliaria (Reglas de mora): el diálogo
 *   lo dice en palabras (`alcanceEnPalabras` del back).
 * · La historia de la cuota, con «Anular» (motivo obligatorio). El back frena
 *   la anulación si un recibo ya pagó intereses de esa cuota después.
 */

import * as React from 'react';
import { Banner } from '@leasefy/cadence';
import { HandCoins } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui';
import { CampoDePlata } from '@/components/ui/campo-de-plata';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/format';
import { diaEnColombia, fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import {
  condonacionesApi,
  type CondonacionDeLaCuota,
  type CondonacionEnPantalla,
} from '@/lib/api/condonaciones.service';
import type { FilaDeInteres } from '@/lib/types/estado-de-cuenta';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';

/** 🔁 Espejo de `CondonarInteresesDto` / `AnularCondonacionDto` (`@MinLength(5)`, `@MaxLength(500)`). */
const MOTIVO_MINIMO = 5;
const MOTIVO_MAXIMO = 500;

const ContextoDeCondonar = React.createContext<((fila: FilaDeInteres) => void) | null>(null);

/** El botón de la fila. Sin proveedor (portales, enlace público) no pinta nada. */
export function BotonCondonarIntereses({ fila }: { fila: FilaDeInteres }) {
  const abrir = React.useContext(ContextoDeCondonar);
  if (!abrir) return null;
  // Sin interés que deber y sin nada condonado no hay nada que hacer ni que ver.
  if (fila.pendiente <= 0 && !(fila.condonado && fila.condonado > 0)) return null;
  return (
    <button
      type="button"
      onClick={() => abrir(fila)}
      className="mt-0.5 text-caption font-medium text-accent hover:underline print:hidden"
      data-testid="condonar-intereses-de-la-fila"
    >
      {fila.pendiente > 0 ? 'Condonar intereses' : 'Ver lo condonado'}
    </button>
  );
}

function sumaDe(c: CondonacionEnPantalla) {
  return c.interesDeMoraCop + c.gastoDeCobranzaCop;
}

/**
 * Envuelve el documento del panel. `onCambio` recarga el documento: lo
 * condonado sale de la deuda y la tabla tiene que decirlo.
 */
export function ProveedorDeCondonarIntereses({
  children,
  habilitado,
  onCambio,
}: {
  children: React.ReactNode;
  /** `false` (no es administrador): el botón no se pinta. */
  habilitado: boolean;
  onCambio: () => void;
}) {
  const [fila, setFila] = React.useState<FilaDeInteres | null>(null);
  const [datos, setDatos] = React.useState<CondonacionDeLaCuota | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const [total, setTotal] = React.useState(true);
  const [interes, setInteres] = React.useState<number | undefined>(undefined);
  const [gasto, setGasto] = React.useState<number | undefined>(undefined);
  const [motivo, setMotivo] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errores, setErrores] = React.useState<{
    motivo?: string;
    interesDeMoraCop?: string;
    gastoDeCobranzaCop?: string;
  }>({});
  const [anulando, setAnulando] = React.useState<string | null>(null);
  const [motivoDeAnular, setMotivoDeAnular] = React.useState('');

  const cerrar = () => {
    setFila(null);
    setDatos(null);
    setTotal(true);
    setInteres(undefined);
    setGasto(undefined);
    setMotivo('');
    setError(null);
    setErrores({});
    setAnulando(null);
    setMotivoDeAnular('');
  };

  React.useEffect(() => {
    if (!fila) return;
    let vivo = true;
    setCargando(true);
    condonacionesApi
      .deLaCuota(fila.cuotaId)
      .then((d) => {
        if (vivo) setDatos(d);
      })
      .catch((e) => {
        if (!vivo) return;
        const { sueltos } = repartirErroresDelServidor(e, {
          campos: [] as const,
          porDefecto: 'No se pudo leer lo que debe esta cuota de intereses.',
          accion: 'leer los intereses de la cuota',
        });
        setError(sueltos.join(' · '));
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [fila]);

  const pendiente = datos?.pendientePorConcepto ?? { interesDeMoraCop: 0, gastoDeCobranzaCop: 0 };
  const aCondonar = total
    ? pendiente.interesDeMoraCop + pendiente.gastoDeCobranzaCop
    : (interes ?? 0) + (gasto ?? 0);
  const puedeEnviar =
    Boolean(datos?.puedeCondonar) &&
    motivo.trim().length >= MOTIVO_MINIMO &&
    aCondonar > 0 &&
    (total ||
      ((interes ?? 0) <= pendiente.interesDeMoraCop && (gasto ?? 0) <= pendiente.gastoDeCobranzaCop));

  const condonar = async () => {
    if (!fila || !puedeEnviar) return;
    setEnviando(true);
    setError(null);
    setErrores({});
    try {
      const d = await condonacionesApi.condonar(fila.cuotaId, {
        total,
        interesDeMoraCop: total ? null : (interes ?? 0),
        gastoDeCobranzaCop: total ? null : (gasto ?? 0),
        motivo: motivo.trim(),
      });
      setDatos(d);
      toast.success('Intereses condonados', {
        description: `${formatCurrency(aCondonar)} de ${d.periodo} salen de la deuda. Queda en la bitácora.`,
      });
      setMotivo('');
      setInteres(undefined);
      setGasto(undefined);
      onCambio();
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['motivo', 'interesDeMoraCop', 'gastoDeCobranzaCop'] as const,
        porDefecto: 'No se pudo condonar.',
        accion: 'condonar los intereses',
      });
      setErrores(porCampo);
      setError(sueltos.length > 0 ? sueltos.join(' · ') : null);
    } finally {
      setEnviando(false);
    }
  };

  const anular = async (id: string) => {
    if (motivoDeAnular.trim().length < MOTIVO_MINIMO) return;
    setEnviando(true);
    setError(null);
    try {
      const d = await condonacionesApi.anular(id, motivoDeAnular.trim());
      setDatos(d);
      toast.success('Condonación anulada', {
        description: 'Esos intereses vuelven a deberse. Queda en la bitácora.',
      });
      setAnulando(null);
      setMotivoDeAnular('');
      onCambio();
    } catch (e) {
      const { sueltos } = repartirErroresDelServidor(e, {
        campos: [] as const,
        porDefecto: 'No se pudo anular la condonación.',
        accion: 'anular la condonación',
      });
      setError(sueltos.join(' · '));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ContextoDeCondonar.Provider value={habilitado ? setFila : null}>
      {children}
      <Dialog open={fila !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
        <DialogContent icon={<HandCoins weight="bold" />} size="md" data-testid="condonar-intereses-dialogo">
          <DialogHeader>
            <DialogTitle>Condonar intereses{datos ? ` de ${datos.periodo}` : ''}</DialogTitle>
            <DialogDescription>
              Sólo lo que la cuota debe hoy y todavía no se pagó (lo pagado ya está facturado). Lo condonado
              sale de la deuda, del recibo y de la factura del interés, y queda en la bitácora con tu motivo.
            </DialogDescription>
          </DialogHeader>

          {cargando && <p className="text-sm text-fg-muted">Leyendo lo que debe la cuota…</p>}

          {datos && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-border-faint p-3 text-sm">
                <dt className="text-fg-muted">Interés de mora que debe hoy</dt>
                <dd className="text-right font-mono tabular-nums" data-testid="condonar-pendiente-interes">
                  {formatCurrency(pendiente.interesDeMoraCop)}
                </dd>
                <dt className="text-fg-muted">Gasto de cobranza que debe hoy</dt>
                <dd className="text-right font-mono tabular-nums" data-testid="condonar-pendiente-gasto">
                  {formatCurrency(pendiente.gastoDeCobranzaCop)}
                </dd>
                {datos.interes.condonadoCop > 0 && (
                  <>
                    <dt className="text-fg-muted">Ya condonado</dt>
                    <dd className="text-right font-mono tabular-nums">{formatCurrency(datos.interes.condonadoCop)}</dd>
                  </>
                )}
              </dl>

              {datos.puedeCondonar ? (
                <>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cuánto condonar">
                    <Button
                      type="button"
                      variant={total ? 'default' : 'outline'}
                      hideArrow
                      size="sm"
                      role="radio"
                      aria-checked={total}
                      onClick={() => setTotal(true)}
                      data-testid="condonar-total"
                    >
                      Condonar el total ({formatCurrency(pendiente.interesDeMoraCop + pendiente.gastoDeCobranzaCop)})
                    </Button>
                    <Button
                      type="button"
                      variant={!total ? 'default' : 'outline'}
                      hideArrow
                      size="sm"
                      role="radio"
                      aria-checked={!total}
                      onClick={() => setTotal(false)}
                      data-testid="condonar-una-parte"
                    >
                      Una parte
                    </Button>
                  </div>
                  {total ? (
                    <Banner variant="info" data-testid="condonar-alcance">
                      {datos.alcanceEnPalabras}
                    </Banner>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label htmlFor="condonar-interes" className="text-sm font-medium">
                          Interés de mora
                        </label>
                        <CampoDePlata
                          id="condonar-interes"
                          areas="cobros_recibos_y_cartera"
                          value={interes}
                          onChange={(v) => setInteres(Number.isFinite(v) ? v : undefined)}
                          aria-label="Interés de mora a condonar"
                          data-testid="condonar-monto-interes"
                        />
                        <ErrorDelCampo
                          id="condonar-interes-error"
                          mensaje={
                            errores.interesDeMoraCop ??
                            ((interes ?? 0) > pendiente.interesDeMoraCop
                              ? `No puede pasar de ${formatCurrency(pendiente.interesDeMoraCop)}.`
                              : null)
                          }
                          pista={`Hasta ${formatCurrency(pendiente.interesDeMoraCop)}.`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="condonar-gasto" className="text-sm font-medium">
                          Gasto de cobranza
                        </label>
                        <CampoDePlata
                          id="condonar-gasto"
                          areas="cobros_recibos_y_cartera"
                          value={gasto}
                          onChange={(v) => setGasto(Number.isFinite(v) ? v : undefined)}
                          aria-label="Gasto de cobranza a condonar"
                          data-testid="condonar-monto-gasto"
                        />
                        <ErrorDelCampo
                          id="condonar-gasto-error"
                          mensaje={
                            errores.gastoDeCobranzaCop ??
                            ((gasto ?? 0) > pendiente.gastoDeCobranzaCop
                              ? `No puede pasar de ${formatCurrency(pendiente.gastoDeCobranzaCop)}.`
                              : null)
                          }
                          pista={`Hasta ${formatCurrency(pendiente.gastoDeCobranzaCop)}.`}
                        />
                      </div>
                      <p className="text-caption text-fg-muted sm:col-span-2">
                        Una condonación parcial perdona sólo esa plata: si la cuota sigue sin pagarse, el interés sigue
                        corriendo.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label htmlFor="condonar-motivo" className="text-sm font-medium">
                      Motivo
                    </label>
                    <Textarea
                      id="condonar-motivo"
                      rows={2}
                      value={motivo}
                      onChange={(e) => {
                        setMotivo(e.target.value);
                        setErrores((x) => ({ ...x, motivo: undefined }));
                      }}
                      placeholder="Por qué se condona (queda en la bitácora)"
                      className="w-full resize-none"
                      maxLength={MOTIVO_MAXIMO}
                      data-testid="condonar-motivo"
                    />
                    <ErrorDelCampo
                      id="condonar-motivo-error"
                      mensaje={errores.motivo ?? null}
                      pista={`Entre ${MOTIVO_MINIMO} y ${MOTIVO_MAXIMO} caracteres.`}
                    />
                  </div>
                </>
              ) : (
                datos.porQueNo && (
                  <Banner variant="info" data-testid="condonar-por-que-no">
                    {datos.porQueNo}
                  </Banner>
                )
              )}

              {datos.condonaciones.length > 0 && (
                <div className="space-y-2" data-testid="condonaciones-de-la-cuota">
                  <p className="text-label uppercase tracking-wide text-fg-subtle">Condonaciones de esta cuota</p>
                  <ul className="space-y-2">
                    {datos.condonaciones.map((c) => (
                      <li key={c.id} className="rounded-md border border-border-faint p-3 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className={c.anulada ? 'text-fg-subtle line-through' : 'font-medium'}>
                            {formatCurrency(sumaDe(c))}
                          </span>
                          <span className="text-caption text-fg-muted">
                            {fechaLarga(diaEnColombia(c.fecha))}
                            {c.condonadaPor ? ` · ${c.condonadaPor}` : ''}
                          </span>
                        </div>
                        <p className="text-caption text-fg-muted">
                          Interés de mora {formatCurrency(c.interesDeMoraCop)} · Gasto de cobranza{' '}
                          {formatCurrency(c.gastoDeCobranzaCop)}
                          {c.alcance === 'DESDE_HOY_SIN_INTERES' ? ' · desde ese día la cuota no liquida interés' : ''}
                        </p>
                        <p className="text-caption">Motivo: {c.motivo}</p>
                        {c.anulada ? (
                          <p className="text-caption text-fg-muted">
                            Anulada el {fechaLarga(diaEnColombia(c.anulada.fecha))}
                            {c.anulada.por ? ` por ${c.anulada.por}` : ''}: {c.anulada.motivo}
                          </p>
                        ) : anulando === c.id ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              rows={2}
                              value={motivoDeAnular}
                              onChange={(e) => setMotivoDeAnular(e.target.value)}
                              placeholder="Por qué se anula (queda en la bitácora)"
                              maxLength={MOTIVO_MAXIMO}
                              className="w-full resize-none"
                              aria-label="Motivo de la anulación"
                              data-testid="anular-condonacion-motivo"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                hideArrow
                                onClick={() => {
                                  setAnulando(null);
                                  setMotivoDeAnular('');
                                }}
                              >
                                No anular
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                hideArrow
                                disabled={enviando || motivoDeAnular.trim().length < MOTIVO_MINIMO}
                                isLoading={enviando}
                                onClick={() => void anular(c.id)}
                                data-testid="anular-condonacion-confirmar"
                              >
                                Anular la condonación
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="mt-1 text-caption font-medium text-danger hover:underline"
                            onClick={() => setAnulando(c.id)}
                            data-testid="anular-condonacion"
                          >
                            Anular
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <Banner variant="danger" data-testid="condonar-error">
              {error}
            </Banner>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" hideArrow onClick={cerrar} disabled={enviando}>
              Cerrar
            </Button>
            {datos?.puedeCondonar && (
              <Button
                type="button"
                hideArrow
                onClick={() => void condonar()}
                disabled={enviando || !puedeEnviar}
                isLoading={enviando}
                data-testid="condonar-confirmar"
              >
                Condonar {aCondonar > 0 ? formatCurrency(aCondonar) : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContextoDeCondonar.Provider>
  );
}
