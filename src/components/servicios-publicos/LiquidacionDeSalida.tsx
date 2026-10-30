'use client';

/**
 * LA LIQUIDACIÓN DE SERVICIOS AL ENTREGAR EL INMUEBLE (reunión con Portofino, 29-10-2026). Su Excel «Liquidación
 * entrega inmueble»: cada corte pendiente hasta la fecha de entrega —los que no han llegado, ESTIMADOS con el
 * promedio de las facturas anteriores— + trámites bancarios − saldo a favor = el anticipo de servicios que se le carga
 * al contrato («Anticipo de servicios públicos»).
 *
 * El trabajo, en orden: la fecha de entrega (la del acta, la terminación o el fin; se cambia) → los meses pendientes
 * (días y valor corregibles: «la hoja de Portofino puso 18 días para 15 oct–29 oct», no cuadra con el calendario) →
 * trámites y saldo a favor → el total con su botón. Cargarlo pide confirmación y lo hace el back con el mecanismo de
 * los conceptos del contrato (permiso `contratos:edit`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from '@/components/ui/toast';
import { confirmar } from '@/components/ui/confirmar';
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { VacioChico } from '@/components/estado/VacioChico';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaCorto, nombreDelMesCorto } from '@/lib/servicios-publicos/corte-de-la-factura';
import {
  conDias,
  conValor,
  explicacionDelEstimado,
  filaAgregada,
  filaParaCargar,
  filasEditables,
  fraseDelTotal,
  problemaDeLosDias,
  totalDeLaSalida,
  TRAMITES_MAXIMOS_COP,
  VALOR_MAXIMO_COP,
  type FilaEditable,
} from '@/lib/servicios-publicos/liquidacion-de-salida';
import {
  serviciosPublicosApi,
  type LiquidacionDeSalida as Liquidacion,
  type OrigenDeLaFechaDeEntrega,
  type SalidaCargada,
} from '@/lib/api/servicios-publicos.service';

const DE_DONDE_SALE: Record<OrigenDeLaFechaDeEntrega, string> = {
  PEDIDA: 'La que escribiste.',
  ACTA_DE_DEVOLUCION: 'Sale del acta de devolución del inmueble.',
  TERMINACION: 'Es el día en que se terminó el contrato.',
  FIN_DEL_CONTRATO: 'Es el fin del contrato: cámbiala si lo entrega otro día.',
};

function codigoDe(e: unknown): string | undefined {
  return (e as { code?: string } | null)?.code;
}

function diaSiguiente(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function plata(texto: string): number {
  const n = Number(texto);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

interface Props {
  contractId: string;
  /** Se pide la primera vez que la pestaña se abre. */
  activa: boolean;
  /** `contratos:edit`: cargar el anticipo al contrato. */
  puedeCargar: boolean;
  onCargada?: (r: SalidaCargada) => void;
}

export function LiquidacionDeSalida({ contractId, activa, puedeCargar, onCargada }: Props) {
  const [pedida, setPedida] = useState<string | null>(null);
  const [datos, setDatos] = useState<Liquidacion | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [faltaLaFecha, setFaltaLaFecha] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [filas, setFilas] = useState<FilaEditable[]>([]);
  const [diasEscritos, setDiasEscritos] = useState<Record<string, string>>({});
  const [tramites, setTramites] = useState('');
  const [saldo, setSaldo] = useState('');
  const [agregando, setAgregando] = useState<{ desde: string; hasta: string; valor: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cargada, setCargada] = useState<SalidaCargada | null>(null);
  const [nadaQueCobrar, setNadaQueCobrar] = useState<{ frase: string; aDevolverCop: number } | null>(null);
  const [yaSePidio, setYaSePidio] = useState(false);

  const leer = useCallback(
    async (fechaEntrega?: string) => {
      setLeyendo(true);
      setError(null);
      setFaltaLaFecha(false);
      setCargada(null);
      setNadaQueCobrar(null);
      try {
        const r = await serviciosPublicosApi.liquidacionDeSalida(contractId, fechaEntrega ? { fechaEntrega } : {});
        setDatos(r);
        setFilas(filasEditables(r.filas));
        setDiasEscritos({});
        setTramites(String(r.tramitesCop));
        setSaldo(r.saldoAFavorCop > 0 ? String(r.saldoAFavorCop) : '');
        setAgregando(null);
      } catch (e) {
        if (codigoDe(e) === 'FALTA_LA_FECHA_DE_ENTREGA') {
          setDatos(null);
          setFaltaLaFecha(true);
        } else setError(e);
      } finally {
        setLeyendo(false);
      }
    },
    [contractId],
  );

  useEffect(() => {
    if (!activa || yaSePidio) return;
    setYaSePidio(true);
    void leer();
  }, [activa, yaSePidio, leer]);

  const fechaEntrega = pedida ?? datos?.fechaEntrega ?? '';
  const elegirFecha = (v: string) => {
    setPedida(v);
    if (v) void leer(v);
  };

  const tramitesCop = plata(tramites);
  const saldoAFavorCop = plata(saldo);
  const total = useMemo(() => totalDeLaSalida(filas, tramitesCop, saldoAFavorCop), [filas, tramitesCop, saldoAFavorCop]);
  const grupos = datos?.grupos ?? [];
  const variosServicios = new Set(filas.map((f) => f.grupo)).size > 1;
  const grupoDe = (f: FilaEditable) => grupos.find((g) => g.grupo === f.grupo) ?? null;

  const problemas: string[] = [];
  if (filas.length === 0) problemas.push('Agrega al menos un mes de servicios.');
  if (filas.some((f) => diasEscritos[f.clave] !== undefined || problemaDeLosDias(f.dias))) problemas.push('Revisa los días: van de 1 a 62.');
  if (filas.some((f) => f.valorCop > VALOR_MAXIMO_COP)) problemas.push('Un mes pasa de $ 100.000.000: revisa los ceros.');
  if (tramitesCop > TRAMITES_MAXIMOS_COP) problemas.push('Los trámites bancarios no pasan de $ 10.000.000.');
  if (saldoAFavorCop > VALOR_MAXIMO_COP) problemas.push('El saldo a favor no pasa de $ 100.000.000.');

  const cambiarFila = (clave: string, hacer: (f: FilaEditable) => FilaEditable) =>
    setFilas((xs) => xs.map((f) => (f.clave === clave ? hacer(f) : f)));

  const escribirDias = (f: FilaEditable, texto: string) => {
    const limpio = texto.replace(/\D/g, '').slice(0, 3);
    const n = Number(limpio);
    if (limpio === '' || problemaDeLosDias(n)) {
      setDiasEscritos((m) => ({ ...m, [f.clave]: limpio }));
      return;
    }
    setDiasEscritos(({ [f.clave]: _quitada, ...resto }) => resto);
    cambiarFila(f.clave, (x) => conDias(x, n));
  };

  const agregar = () => {
    if (!agregando) return;
    const { desde, hasta, valor } = agregando;
    const fila = filaAgregada({ corteDesde: desde, corteHasta: hasta, valorCop: plata(valor), grupo: grupos.length === 1 ? grupos[0] : null }, filas.length);
    setFilas((xs) => [...xs, fila].sort((a, b) => a.corteDesde.localeCompare(b.corteDesde)));
    setAgregando(null);
  };
  const problemaDeLaAgregada = agregando
    ? !agregando.desde || !agregando.hasta
      ? 'Elige el corte: desde y hasta.'
      : agregando.hasta < agregando.desde
        ? 'El corte termina antes de empezar.'
        : problemaDeLosDias(filaAgregada({ corteDesde: agregando.desde, corteHasta: agregando.hasta, valorCop: 0 }, 0).dias)
          ? 'Un corte va de 1 a 62 días.'
          : !(plata(agregando.valor) > 0)
            ? 'Escribe el valor del mes.'
            : null
    : null;

  const cargar = async () => {
    if (!fechaEntrega) return;
    const ok = await confirmar({
      titulo: `¿Cargar ${formatCurrency(total.totalCop)} al contrato como anticipo de servicios públicos?`,
      descripcion: `Entra como un cobro al inquilino en la cuota de ${nombreDelMesCorto(fechaEntrega.slice(0, 7), true)} (o en la próxima que no haya pagado). Lo ves y lo puedes quitar en los conceptos del contrato.`,
      accion: `Cargar ${formatCurrency(total.totalCop)} al contrato`,
    });
    if (!ok) return;
    setEnviando(true);
    setNadaQueCobrar(null);
    try {
      const r = await serviciosPublicosApi.cargarLiquidacionDeSalida(contractId, {
        fechaEntrega,
        filas: filas.map(filaParaCargar),
        tramitesCop,
        saldoAFavorCop,
      });
      setCargada(r);
      toast.success(`Listo: cargamos ${formatCurrency(r.totalCop)} al contrato como anticipo de servicios públicos.`, {
        description: r.avisos.length > 0 ? r.avisos.join(' ') : undefined,
      });
      onCargada?.(r);
    } catch (e) {
      if (codigoDe(e) === 'NADA_QUE_COBRAR') {
        const detalle = (e as { detalle?: { aDevolverCop?: unknown; message?: unknown } }).detalle;
        setNadaQueCobrar({
          frase: typeof detalle?.message === 'string' ? detalle.message : (e as Error).message,
          aDevolverCop: typeof detalle?.aDevolverCop === 'number' ? detalle.aDevolverCop : total.aDevolverCop,
        });
      } else {
        toast.error('No se pudo cargar al contrato', { description: mensajeParaLaPersona(e, { accion: 'cargar el anticipo al contrato' }) });
      }
    } finally {
      setEnviando(false);
    }
  };

  if (error) return <FalloDeCarga error={error} queEs="la liquidación de la entrega" onReintentar={() => leer(pedida ?? undefined)} />;

  return (
    <div className="space-y-6" data-testid="liquidacion-de-salida">
      {/* 1 · La fecha de entrega: de ella salen los meses pendientes. */}
      <section className="space-y-1.5">
        <Label htmlFor="salida-entrega" required>
          El inquilino entrega el inmueble el
        </Label>
        <div className="sm:max-w-xs">
          <CampoDeFecha id="salida-entrega" value={fechaEntrega} onChange={elegirFecha} invalido={faltaLaFecha && !fechaEntrega} testid="salida-entrega" />
        </div>
        <ErrorDelCampo
          id="salida-entrega-error"
          mensaje={faltaLaFecha && !fechaEntrega ? 'Escribe el día en que el inquilino entrega el inmueble: el contrato no tiene acta de devolución ni fecha de fin.' : undefined}
          pista={datos?.fechaEntregaDe && !pedida ? DE_DONDE_SALE[datos.fechaEntregaDe] : 'Al cambiarla se vuelven a contar los meses pendientes.'}
        />
      </section>

      {leyendo && !datos ? (
        <EsqueletoTabla columnas={3} filas={3} />
      ) : !datos ? null : (
        <div className={cn('space-y-6 transition-opacity', leyendo && 'opacity-60')} aria-busy={leyendo}>
          {datos.avisos.length > 0 && (
            <ul className="space-y-1 rounded-md bg-warning-soft px-3 py-2 text-body-sm text-fg" data-testid="salida-avisos">
              {datos.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          {/* 2 · Los meses pendientes hasta la entrega. */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-label text-fg-subtle">Meses pendientes hasta la entrega</h3>
              <p className="text-caption text-fg-muted">Días calendario, del primero al último del corte.</p>
            </div>
            {filas.length === 0 ? (
              <VacioChico
                ilustracion="bombillo"
                titulo="No hay meses pendientes de servicios."
                detalle={datos.sinHistorial ? 'El inmueble no tiene facturas con qué estimar: agrega los meses a mano.' : 'Todo lo de servicios hasta la entrega está pagado.'}
              />
            ) : (
              <ul className="divide-y divide-border-faint rounded-lg border border-border" data-testid="salida-filas">
                {filas.map((f) => {
                  const g = grupoDe(f);
                  const escrito = diasEscritos[f.clave];
                  const problemaDias = escrito !== undefined ? (problemaDeLosDias(Number(escrito)) ?? 'Escribe los días.') : problemaDeLosDias(f.dias);
                  const etiqueta = `corte del ${diaCorto(f.corteDesde)} al ${diaCorto(f.corteHasta)}`;
                  return (
                    <li key={f.clave} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_5.5rem_10rem_auto] md:items-start" data-testid={`salida-fila-${f.corteDesde}`}>
                      <div className="col-start-1 row-start-1 min-w-0 space-y-0.5">
                        <p className="text-body-sm text-fg">
                          Factura de {nombreDelMesCorto(f.mesFacturado, f.mesFacturado.slice(0, 4) !== fechaEntrega.slice(0, 4))}
                          {variosServicios ? <span className="text-fg-muted"> · {f.nombreDelServicio}</span> : null}
                        </p>
                        <p className="text-caption text-fg-muted">
                          Consumo del <span className="font-mono tabular-nums">{diaCorto(f.corteDesde)}</span> al{' '}
                          <span className="font-mono tabular-nums">{diaCorto(f.corteHasta)}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                          {f.estimado ? (
                            <StatusBadge tone="neutral">Estimado</StatusBadge>
                          ) : (
                            <StatusBadge tone="info">Llegó sin pagar</StatusBadge>
                          )}
                          {f.valorAMano && !f.agregada && <span className="text-caption text-fg-muted">Corregido a mano</span>}
                        </div>
                        <p className="text-caption text-fg-muted" data-testid={`salida-explicacion-${f.corteDesde}`}>
                          {f.agregada
                            ? 'Lo agregaste a mano.'
                            : f.estimado
                              ? explicacionDelEstimado(g)
                              : f.tarifaDiariaCop
                                ? `La factura que llegó, partida hasta la entrega (${formatCurrency(f.tarifaDiariaCop)} por día).`
                                : 'La factura que llegó y no se ha pagado.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFilas((xs) => xs.filter((x) => x.clave !== f.clave))}
                        aria-label={`Quitar el ${etiqueta}`}
                        className="col-start-2 row-start-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-start-4 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                        data-testid={`salida-quitar-${f.corteDesde}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <div className="col-span-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 md:col-span-2 md:col-start-2 md:row-start-1 md:grid-cols-[5.5rem_10rem]">
                        <div className="space-y-1">
                          <Label htmlFor={`dias-${f.clave}`} className="text-caption text-fg-muted">
                            Días
                          </Label>
                          <Input
                            id={`dias-${f.clave}`}
                            inputMode="numeric"
                            value={escrito ?? String(f.dias)}
                            onChange={(e) => escribirDias(f, e.target.value)}
                            aria-invalid={problemaDias ? true : undefined}
                            aria-describedby={problemaDias ? `dias-${f.clave}-error` : undefined}
                            className="font-mono tabular-nums"
                            data-testid={`salida-dias-${f.corteDesde}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`valor-${f.clave}`} className="text-caption text-fg-muted">
                            Valor
                          </Label>
                          <MoneyInput
                            id={`valor-${f.clave}`}
                            value={String(f.valorCop)}
                            onChange={(v) => cambiarFila(f.clave, (x) => conValor(x, plata(v)))}
                            data-testid={`salida-valor-${f.corteDesde}`}
                          />
                        </div>
                        <ErrorDelCampo id={`dias-${f.clave}-error`} mensaje={problemaDias ?? undefined} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {agregando ? (
              <div className="space-y-3 rounded-lg bg-surface-muted p-4" data-testid="salida-agregar">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="agregar-desde">Corte desde</Label>
                    <CampoDeFecha id="agregar-desde" value={agregando.desde} onChange={(v) => setAgregando((a) => (a ? { ...a, desde: v } : a))} testid="agregar-desde" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agregar-hasta">Corte hasta</Label>
                    <CampoDeFecha id="agregar-hasta" value={agregando.hasta} onChange={(v) => setAgregando((a) => (a ? { ...a, hasta: v } : a))} testid="agregar-hasta" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agregar-valor">Valor</Label>
                    <MoneyInput id="agregar-valor" value={agregando.valor} onChange={(v) => setAgregando((a) => (a ? { ...a, valor: v } : a))} data-testid="agregar-valor" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {problemaDeLaAgregada && <p className="mr-auto text-caption text-fg-muted">{problemaDeLaAgregada}</p>}
                  <Button size="sm" variant="ghost" hideArrow onClick={() => setAgregando(null)}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="outline" hideArrow disabled={!!problemaDeLaAgregada} onClick={agregar} data-testid="agregar-el-mes">
                    Agregar el mes
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                hideArrow
                onClick={() => {
                  // Arranca después del último corte de la lista y llega hasta la entrega: lo de siempre.
                  const ultima = filas[filas.length - 1];
                  setAgregando({ desde: ultima ? diaSiguiente(ultima.corteHasta) : '', hasta: fechaEntrega, valor: '' });
                }}
                data-testid="salida-agregar-mes"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar un mes a mano
              </Button>
            )}
          </section>

          {/* 3 · Trámites y saldo a favor. */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salida-tramites">Trámites bancarios</Label>
              <MoneyInput id="salida-tramites" value={tramites} onChange={setTramites} data-testid="salida-tramites" />
              <ErrorDelCampo id="salida-tramites-error" pista={`Por defecto ${formatCurrency(datos.tramitesPorDefectoCop)}.`} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salida-saldo">Saldo a favor del inquilino</Label>
              <MoneyInput id="salida-saldo" value={saldo} onChange={setSaldo} data-testid="salida-saldo" />
              <ErrorDelCampo id="salida-saldo-error" pista="Lo que se le debe y se descuenta aquí." />
            </div>
          </section>

          {/* 4 · El total y la acción, juntos. */}
          <section className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-susurro md:p-5" data-testid="salida-total">
            <dl className="space-y-1.5 text-body-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fg-muted">
                  {filas.length === 1 ? '1 mes de servicios' : `${filas.length} meses de servicios`}
                </dt>
                <dd className="font-mono tabular-nums text-fg">{formatCurrency(total.subtotalCop)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fg-muted">+ Trámites bancarios</dt>
                <dd className="font-mono tabular-nums text-fg">{formatCurrency(total.tramitesCop)}</dd>
              </div>
              {total.saldoAFavorCop > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-fg-muted">− Saldo a favor</dt>
                  <dd className="font-mono tabular-nums text-fg">− {formatCurrency(total.saldoAFavorCop)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                <dt className="text-fg">{total.aDevolverCop > 0 ? 'Hay que devolverle' : 'Anticipo de servicios públicos'}</dt>
                {/* 29-10: sin `text-h3` (trae la letra de los títulos y le quitaba el mono a la cifra). */}
                <dd className="font-mono text-[20px] leading-snug tracking-[-0.02em] tabular-nums text-fg" data-testid="salida-total-cop">
                  {formatCurrency(total.aDevolverCop > 0 ? total.aDevolverCop : total.totalCop)}
                </dd>
              </div>
            </dl>
            <p className="text-caption text-fg-muted" data-testid="salida-frase">
              {fraseDelTotal(total, filas.length)}
            </p>

            <Presence show={!!nadaQueCobrar} distance="xs">
              <p className="rounded-md bg-info-soft px-3 py-2 text-body-sm text-fg" data-testid="salida-nada-que-cobrar">
                {nadaQueCobrar?.frase}
                {nadaQueCobrar && nadaQueCobrar.aDevolverCop > 0 ? (
                  <>
                    {' '}
                    Hay que devolverle <span className="font-mono tabular-nums">{formatCurrency(nadaQueCobrar.aDevolverCop)}</span>.
                  </>
                ) : null}
              </p>
            </Presence>

            {cargada ? (
              <p className="flex items-start gap-2 text-body-sm text-fg" data-testid="salida-cargada">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                <span>
                  Cargado al contrato: {cargada.nombre} por <span className="font-mono tabular-nums">{formatCurrency(cargada.valorCop)}</span>
                  {cargada.meses.length > 0 ? ` en ${cargada.meses.map((m) => nombreDelMesCorto(m.mes, true)).join(', ')}` : ''}.
                </span>
              </p>
            ) : puedeCargar ? (
              <div className="space-y-2">
                <Button
                  className="h-auto min-h-11 w-full whitespace-normal py-2.5 text-center leading-snug sm:w-auto"
                  hideArrow
                  disabled={problemas.length > 0 || total.totalCop <= 0 || enviando || leyendo || !fechaEntrega}
                  isLoading={enviando}
                  onClick={() => void cargar()}
                  data-testid="salida-cargar"
                >
                  Cargar al contrato como anticipo de servicios públicos
                </Button>
                {(problemas.length > 0 || total.totalCop <= 0) && (
                  <p className="text-caption text-fg-muted" data-testid="salida-que-falta">
                    {problemas[0] ?? 'No hay nada que cobrarle: el saldo a favor cubre los servicios.'}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-caption text-fg-muted" data-testid="salida-sin-permiso">
                Cargarlo al contrato lo hace quien puede editar contratos.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
