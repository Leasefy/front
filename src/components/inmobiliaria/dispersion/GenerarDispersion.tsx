'use client';

/**
 * Generar la dispersión del mes, en UNA pantalla.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Reemplaza a `DispersionWizard`, que eran seis pasos (Mes · Cuotas ·
 * Comisiones · Netos · A quién · Confirmar). Nico, 21-09-2026, mirándolo:
 *
 *   «uy ese flujo está rarísimo jajaj porque por allá al final me dice a quién,
 *   y al principio muestra todas las propiedades, más bien pregunta a quién
 *   primero (mejora también esa visualización, eso con scroll infinito es
 *   horrible), de ahí en la misma pantalla al que seleccione muestras las
 *   propiedades que tiene y si sólo tiene una pues nada, si tiene más de una
 *   muestra esas y que seleccione a cuáles va a dispersar de esas que tiene
 *   (siempre vienen seleccionadas), y ya ahí mismo también por cada propietario
 *   muestra el monto total por dispersar, también debe mostrar el monto de cada
 *   una de las propiedades, y también de las seleccionadas cuál es las
 *   comisiones y ya ahí en esa misma puede darle confirmar, eso no se necesitan
 *   todos esos pasos.»
 *
 * Los cuatro pasos del medio no pedían ninguna decisión: mostraban la misma
 * plata en cuatro cortes distintos y obligaban a apretar «Siguiente» cuatro
 * veces para llegar a la única pregunta del flujo, que es a quién se le gira.
 *
 * ── Qué se conservó del asistente, y por qué ────────────────────────────────
 *
 * ·  el motivo del back cuando no liquida (D7): con el inmueble y su enlace, y
 *    reintentar SÓLO si el fallo fue de red — `FalloDelAsistente`;
 * ·  la razón verdadera de un mes vacío, contada por el back — `MesSinGiros`;
 * ·  el rótulo del canon según la base (`CAUSADO` no es plata recaudada);
 * ·  las cuotas que llegaron tarde, que viajan en el `generate` aunque su dueño
 *    ya tenga liquidación — sin su id esas cuotas no se giran nunca;
 * ·  la cuenta bancaria que falta se DICE, no se inventa;
 * ·  los que quedaron fuera se nombran al terminar.
 *
 * 🔴 Y la regla que manda sobre todo: **la plata la cuenta el back.** Ver
 * `lo-que-se-va-a-girar.ts`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CaretDown,
  CaretRight,
  Check,
  MagnifyingGlass,
  Warning,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/pagination';
import { toast } from '@/components/ui/toast';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import type {
  CuotasTardias,
  PorQueElMesVieneVacio,
  VistaPreviaDeDispersiones,
} from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { mesEnTitulo } from '@/lib/utils/mes';
import { leerLiquidacionFrenada, motivoLegible } from '@/lib/api/dispersiones-errores';
import {
  ROTULO_DEL_CANON,
  baseDeLaLiquidacion,
  type BaseDelCanon,
} from '@/lib/propietarios/base-del-canon';
import { motivoDelMesVacio } from '../dispersion-mes-vacio';
import { CuotasQueLlegaronTarde } from '../CuotasQueLlegaronTarde';
import {
  ResumenDelMandato,
  type NumerosDelMandato,
} from '../mandato/ElMandatoEnLaLiquidacion';
import { FalloDelAsistente, MesSinGiros } from './FalloDelAsistente';
import {
  NADA_FUERA,
  elTotalDeLaCorrida,
  elTotalDelPropietario,
  entraEnLaCorrida,
  huellaDeLaSeleccion,
  inmueblesDelPropietario,
  loQueViajaAlBack,
  seleccionCompleta,
  type PropietarioDeLaPrevia,
  type SeleccionDeLaLiquidacion,
} from './lo-que-se-va-a-girar';

/** El mes de hoy, `YYYY-MM`. */
function mesDeHoy(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

export interface GenerarDispersionProps {
  initialMonth?: string;
  /** `month` es el que se acaba de generar: la lista tiene que abrir ahí. */
  onComplete?: (month: string) => void;
  onCancel?: () => void;
}

export function GenerarDispersion({
  initialMonth,
  onComplete,
  onCancel,
}: GenerarDispersionProps) {
  const [mes, setMes] = useState(initialMonth ?? mesDeHoy());
  const [busqueda, setBusqueda] = useState('');
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [errorAlGenerar, setErrorAlGenerar] = useState<unknown>(null);

  /**
   * Lo que quedó AFUERA. El default es «todos marcados» (pedido del CEO), así
   * que guardar lo excluido deja el caso normal en dos conjuntos vacíos y no en
   * una lista de 518 ids que hay que mantener al día.
   */
  const [seleccion, setSeleccion] = useState<SeleccionDeLaLiquidacion>(NADA_FUERA);

  // ── La previa del mes: la lista para elegir ──────────────────────────────
  const [previa, setPrevia] = useState<VistaPreviaDeDispersiones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    dispersionesApi
      .preview(mes)
      .then((r) => {
        if (!cancelado) setPrevia(r);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setPrevia(null);
        setError(e);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [mes, intento]);

  /*
   * ── Los montos de la selección, calculados por el back ───────────────────
   *
   * Sólo cuando la selección se achica: con todo marcado alcanza la previa del
   * mes, que ya vino. Se espera un momento antes de preguntar para no disparar
   * una cuenta por cada clic mientras alguien destilda cinco propietarios.
   */
  const [ajustada, setAjustada] = useState<{
    huella: string;
    previa: VistaPreviaDeDispersiones;
  } | null>(null);
  const huella = huellaDeLaSeleccion(seleccion);
  const completa = seleccionCompleta(seleccion);

  useEffect(() => {
    if (!previa || completa) {
      setAjustada(null);
      return;
    }
    let cancelado = false;
    const espera = setTimeout(() => {
      dispersionesApi
        .previewDeLaSeleccion(mes, loQueViajaAlBack(previa, seleccion))
        .then((r) => {
          if (!cancelado) setAjustada({ huella, previa: r });
        })
        .catch(() => {
          /*
           * Que falle la cuenta de la selección no rompe la pantalla: los montos
           * quedan marcados como no exactos y el botón de confirmar sigue
           * apagado. Lo que NO se hace es mostrar un número como si fuera del
           * back.
           */
          if (!cancelado) setAjustada(null);
        });
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
    // `huella` resume la selección: sin ella, el efecto no vería un destilde.
  }, [previa, mes, huella, completa, seleccion]);

  /** La previa de la selección sirve sólo si es de la selección de AHORA. */
  const ajustadaVigente = ajustada?.huella === huella ? ajustada.previa : null;

  // ── Lo que hay para elegir ───────────────────────────────────────────────
  const candidatos = useMemo<PropietarioDeLaPrevia[]>(
    () => (previa?.propietarios ?? []).filter((p) => !p.yaExiste),
    [previa],
  );
  const tardias: CuotasTardias[] = previa?.tardias ?? [];
  const tardiasQueSeSuman = useMemo(() => tardias.filter((t) => t.seSuman), [tardias]);
  const haySumables = tardiasQueSeSuman.length > 0;
  const base: BaseDelCanon = previa ? baseDeLaLiquidacion(previa) : 'CAUSADO';
  const mandato: NumerosDelMandato = {
    cuentaPorCobrarAlInquilinoCop: previa?.totalCuentaPorCobrarAlInquilino,
    interesesCop: previa?.totalIntereses,
  };
  const vacio: PorQueElMesVieneVacio | null = previa?.vacio ?? null;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return candidatos;
    return candidatos.filter(
      (p) =>
        p.propietarioName.toLowerCase().includes(q) ||
        p.items.some((i) => i.propertyTitle.toLowerCase().includes(q)),
    );
  }, [candidatos, busqueda]);

  const paginado = useTablePagination(filtrados, {
    resetKey: `${mes}|${busqueda}`,
  });

  const dentro = useMemo(
    () => candidatos.filter((p) => entraEnLaCorrida(p, seleccion)),
    [candidatos, seleccion],
  );

  const total = previa
    ? elTotalDeLaCorrida({ previa, ajustada: ajustadaVigente, seleccion })
    : null;

  // ── Marcar y destildar ──────────────────────────────────────────────────
  const alternarPropietario = useCallback((p: PropietarioDeLaPrevia) => {
    setSeleccion((prev) => {
      const fuera = new Set(prev.propietariosFuera);
      const inmuebles = new Set(prev.inmueblesFuera);
      if (fuera.has(p.propietarioId)) {
        fuera.delete(p.propietarioId);
        /*
         * Volver a marcar al propietario vuelve a marcar sus inmuebles. Sin
         * esto, alguien que destilda un inmueble, destilda al dueño y lo vuelve
         * a marcar se queda con un inmueble afuera que ya no ve, porque el
         * detalle se cerró.
         */
        for (const i of inmueblesDelPropietario(p)) inmuebles.delete(i.propertyId);
      } else {
        fuera.add(p.propietarioId);
      }
      return { propietariosFuera: fuera, inmueblesFuera: inmuebles };
    });
  }, []);

  const alternarInmueble = useCallback((propertyId: string) => {
    setSeleccion((prev) => {
      const inmuebles = new Set(prev.inmueblesFuera);
      if (inmuebles.has(propertyId)) inmuebles.delete(propertyId);
      else inmuebles.add(propertyId);
      return { ...prev, inmueblesFuera: inmuebles };
    });
  }, []);

  const marcarTodos = useCallback(() => setSeleccion(NADA_FUERA), []);
  const desmarcarTodos = useCallback(
    () =>
      setSeleccion({
        propietariosFuera: new Set(candidatos.map((p) => p.propietarioId)),
        inmueblesFuera: new Set(),
      }),
    [candidatos],
  );

  const alternarDetalle = useCallback((propietarioId: string) => {
    setAbiertos((prev) => {
      const s = new Set(prev);
      if (s.has(propietarioId)) s.delete(propietarioId);
      else s.add(propietarioId);
      return s;
    });
  }, []);

  const cambiarMes = useCallback((nuevo: string) => {
    setMes(nuevo);
    // La selección, el detalle abierto y el motivo de un fallo eran de OTRO mes.
    setSeleccion(NADA_FUERA);
    setAbiertos(new Set());
    setErrorAlGenerar(null);
    setBusqueda('');
  }, []);

  // ── Confirmar ───────────────────────────────────────────────────────────
  const sePuedeConfirmar =
    Boolean(previa) &&
    (dentro.length > 0 || haySumables) &&
    // 🔴 Nunca se confirma sobre un número que no vino del back.
    (total?.exacto ?? false) &&
    !enviando;

  const confirmar = useCallback(async () => {
    if (!previa) return;
    setEnviando(true);
    setErrorAlGenerar(null);
    try {
      const viaje = loQueViajaAlBack(previa, seleccion);
      /*
       * Las cuotas que llegaron tarde van aunque su dueño ya tenga liquidación
       * del mes: sin su id el back no lo mira y esas cuotas no se giran nunca.
       * Sólo hace falta nombrarlos cuando se manda lista.
       */
      const propietarioIds = viaje.propietarioIds
        ? [
            ...new Set([
              ...viaje.propietarioIds,
              ...tardiasQueSeSuman.map((t) => t.propietarioId),
            ]),
          ]
        : undefined;

      const r = await dispersionesApi.generate(
        mes,
        propietarioIds,
        viaje.propertyIds,
      );

      const sumadas = r.tardias?.sumadas ?? [];
      const sinSumar = r.tardias?.sinSumar ?? [];
      const cuotasSumadas = sumadas.reduce((n, t) => n + t.cuotas, 0);
      const deLasTardias = [
        sumadas.length > 0
          ? `${cuotasSumadas === 1 ? 'Se sumó 1 cuota que llegó tarde' : `Se sumaron ${cuotasSumadas} cuotas que llegaron tarde`} a ${sumadas.length} ${sumadas.length === 1 ? 'liquidación' : 'liquidaciones'} del mes.`
          : '',
        sinSumar.length > 0
          ? `${sinSumar.length} ${sinSumar.length === 1 ? 'propietario tiene' : 'propietarios tienen'} cuotas tardías que no se pudieron sumar.`
          : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (r.created === 0 && sumadas.length > 0) {
        toast.success('Cuotas sumadas a las liquidaciones del mes', {
          description: deLasTardias,
        });
      } else if (r.created === 0) {
        toast.info('No se generó ninguna dispersión', {
          description:
            r.skipped > 0
              ? `Ya existían las ${r.skipped} dispersiones de ${mesEnTitulo(mes)}.`
              : `No quedaba ninguna cuota de propietario por girar en ${mesEnTitulo(mes)}.`,
        });
      } else {
        toast.success('Dispersiones generadas correctamente', {
          description: [
            // Los que quedaron fuera se dicen: «se generaron 3» se lee igual en
            // un mes de 3 propietarios que en uno de 40 donde alguien destildó
            // 37 sin darse cuenta.
            r.noElegidos > 0
              ? `${r.created} para ${mesEnTitulo(mes)}. ${r.noElegidos} quedaron fuera de la selección.`
              : `Se generaron ${r.created} dispersiones para ${mesEnTitulo(mes)}`,
            deLasTardias,
          ]
            .filter(Boolean)
            .join(' '),
        });
      }

      onComplete?.(mes);
    } catch (e) {
      /*
       * El back para la corrida ENTERA por un solo inmueble mal cargado; sin
       * decir cuál, la persona no tiene por dónde empezar. El aviso con el
       * enlace queda pegado al botón; el toast sólo avisa.
       */
      setErrorAlGenerar(e);
      const frenada = leerLiquidacionFrenada(e);
      toast.error(frenada?.titulo ?? 'No se generaron las dispersiones', {
        description: frenada?.mensaje ?? motivoLegible(e) ?? undefined,
      });
    } finally {
      setEnviando(false);
    }
  }, [previa, seleccion, mes, tardiasQueSeSuman, onComplete]);

  const hayQueElegir = !cargando && !error && (candidatos.length > 0 || haySumables);

  return (
    <div className="space-y-4" data-testid="generar-dispersion">
      {/* ── El mes: UN control. Eran doce tarjetas de radio ocupando la
          primera pantalla entera para elegir un dato que casi nunca cambia. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-fg">El mes que vas a liquidar</p>
          <p className="text-xs text-fg-muted" data-testid="rotulo-de-la-base">
            {ROTULO_DEL_CANON[base]}
            {base === 'RECAUDADO'
              ? ' · sólo entran las cuotas que el inquilino ya pagó completas'
              : ' · no depende de que el inquilino haya pagado'}
          </p>
        </div>
        <SelectorDeMes mes={mes} onCambiar={cambiarMes} testId="mes-de-la-liquidacion" />
      </div>

      {previa != null && previa.yaGenerados > 0 && (
        <AlertaAccionable
          severidad="warning"
          titulo={`${previa.yaGenerados} ${previa.yaGenerados === 1 ? 'propietario ya tiene' : 'propietarios ya tienen'} su liquidación de ${mesEnTitulo(mes)}`}
          data-testid="ya-generados"
        >
          No se vuelven a generar ni aparecen en la lista. Si les llegaron cuotas
          después, se les suman a la liquidación que ya existe.
        </AlertaAccionable>
      )}

      {cargando ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-fg-muted">Calculando lo que se giraría…</p>
        </div>
      ) : error ? (
        <FalloDelAsistente
          error={error}
          queNoSalio="No pudimos calcular este mes"
          onReintentar={() => setIntento((n) => n + 1)}
        />
      ) : candidatos.length === 0 && !haySumables ? (
        <MesSinGiros
          motivo={motivoDelMesVacio({
            mes,
            yaGenerados: previa?.yaGenerados ?? 0,
            vacio,
          })}
        />
      ) : null}

      {hayQueElegir && (
        <>
          {/* D1/D2: qué parte del mes se gira sin recaudo y qué intereses le
              tocan al propietario. */}
          <ResumenDelMandato numeros={mandato} />
          <CuotasQueLlegaronTarde tardias={tardias} />

          {/* ── A QUIÉN. Es la única pregunta del flujo, así que va primero y
              los filtros viven DENTRO de la tarjeta de la lista que gobiernan:
              suelto arriba, un buscador no dice qué está filtrando. */}
          <section
            className="rounded-lg border border-border bg-surface"
            data-testid="a-quien"
          >
            <header className="space-y-3 border-b border-border-faint px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-fg">
                  ¿A quién le giras este mes?
                </h2>
                <span
                  className="text-sm text-fg-muted tabular-nums"
                  data-testid="cuantos-seleccionados"
                >
                  {dentro.length} de {candidatos.length}{' '}
                  {candidatos.length === 1 ? 'propietario' : 'propietarios'}
                </span>
              </div>
              <p className="text-sm text-fg-muted">
                Vienen todos marcados. Destilda a quien quieras dejar para
                después —un pago que todavía no acredita, una cuenta sin
                confirmar— y, en los que tienen más de un inmueble, a cuáles se
                les gira. Lo que dejes afuera no se pierde: vuelve el mes que
                viene.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[16rem] flex-1">
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                    aria-hidden="true"
                  />
                  <Input
                    className="pl-9"
                    placeholder="Propietario o inmueble"
                    aria-label="Buscar un propietario o un inmueble"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    data-testid="buscar-propietario"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  hideArrow
                  onClick={dentro.length === candidatos.length ? desmarcarTodos : marcarTodos}
                  data-testid="marcar-todos"
                >
                  {dentro.length === candidatos.length
                    ? 'Destildar todos'
                    : 'Marcar todos'}
                </Button>
              </div>
            </header>

            {paginado.pageItems.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-muted" data-testid="sin-resultados">
                Ningún propietario ni inmueble coincide con «{busqueda}».
              </p>
            ) : (
              <ul className="divide-y divide-border-faint">
                {paginado.pageItems.map((p) => (
                  <FilaDelPropietario
                    key={p.propietarioId}
                    p={p}
                    seleccion={seleccion}
                    ajustada={ajustadaVigente}
                    base={base}
                    abierto={abiertos.has(p.propietarioId)}
                    onAlternarDetalle={() => alternarDetalle(p.propietarioId)}
                    onAlternar={() => alternarPropietario(p)}
                    onAlternarInmueble={alternarInmueble}
                  />
                ))}
              </ul>
            )}

            {paginado.shouldPaginate && (
              <div className="border-t border-border-faint px-2 py-1">
                <TablePagination
                  total={paginado.total}
                  page={paginado.page}
                  pageSize={paginado.pageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={paginado.setPage}
                  onPageSizeChange={paginado.setPageSize}
                />
              </div>
            )}
          </section>
        </>
      )}

      {/* El motivo del back al confirmar, pegado al botón que lo disparó. */}
      {errorAlGenerar != null && (
        <FalloDelAsistente
          error={errorAlGenerar}
          queNoSalio="No se generaron las dispersiones"
        />
      )}

      {/* ── LO QUE VAS A GIRAR, y confirmar acá mismo. Era el paso 6. */}
      {hayQueElegir && total != null && (
        <div
          className="sticky bottom-0 z-10 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
          data-testid="lo-que-vas-a-girar"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <dl className="flex flex-wrap items-end gap-x-8 gap-y-2">
              <Cifra
                rotulo="Propietarios"
                valor={String(total.propietarios)}
                testId="total-propietarios"
              />
              <Cifra
                rotulo={ROTULO_DEL_CANON[base]}
                valor={formatCurrency(total.canonCop)}
                testId="total-canon"
              />
              <Cifra
                rotulo="Comisiones"
                valor={formatCurrency(total.comisionesCop)}
                testId="total-comisiones"
              />
              <Cifra
                rotulo="Total a girar"
                valor={formatCurrency(total.aGirarCop)}
                testId="total-a-girar"
                grande
              />
            </dl>
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button type="button" variant="ghost" hideArrow onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                hideArrow
                onClick={confirmar}
                disabled={!sePuedeConfirmar}
                isLoading={enviando}
                data-testid="confirmar"
              >
                <Check className="h-4 w-4" weight="bold" />
                {dentro.length === 1
                  ? 'Generar 1 dispersión'
                  : `Generar ${dentro.length} dispersiones`}
              </Button>
            </div>
          </div>

          {/* Mientras la cuenta de la selección viene en camino, se dice — y el
              botón está apagado. Un total provisional al lado de un botón vivo
              es una promesa que el back no firmó. */}
          {!total.exacto && (
            <p
              className="mt-2 flex items-center gap-1.5 text-xs text-fg-muted"
              data-testid="recalculando"
            >
              <Warning className="h-3.5 w-3.5" aria-hidden="true" />
              Estamos recalculando lo que se gira con lo que seleccionaste.
            </p>
          )}
          {haySumables && (
            <p className="mt-2 text-xs text-fg-muted" data-testid="confirmacion-tardias">
              Y a {tardiasQueSeSuman.length}{' '}
              {tardiasQueSeSuman.length === 1
                ? 'liquidación que ya existe se le suman'
                : 'liquidaciones que ya existen se les suman'}{' '}
              las cuotas que llegaron tarde.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Cifra({
  rotulo,
  valor,
  testId,
  grande,
}: {
  rotulo: string;
  valor: string;
  testId: string;
  grande?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fg-muted">{rotulo}</dt>
      <dd
        className={cn(
          'font-semibold tabular-nums text-fg',
          grande ? 'text-2xl' : 'text-lg',
        )}
        data-testid={testId}
      >
        {valor}
      </dd>
    </div>
  );
}

/**
 * Un propietario: su casilla, su plata y —sólo si tiene más de un inmueble— sus
 * inmuebles con casilla propia. Con uno solo no se pregunta nada, que es lo que
 * pidió Nico: «si sólo tiene una pues nada».
 */
function FilaDelPropietario({
  p,
  seleccion,
  ajustada,
  base,
  abierto,
  onAlternar,
  onAlternarDetalle,
  onAlternarInmueble,
}: {
  p: PropietarioDeLaPrevia;
  seleccion: SeleccionDeLaLiquidacion;
  ajustada: VistaPreviaDeDispersiones | null;
  base: BaseDelCanon;
  abierto: boolean;
  onAlternar: () => void;
  onAlternarDetalle: () => void;
  onAlternarInmueble: (propertyId: string) => void;
}) {
  const inmuebles = inmueblesDelPropietario(p);
  const varios = inmuebles.length > 1;
  const marcado = !seleccion.propietariosFuera.has(p.propietarioId);
  const dentro = entraEnLaCorrida(p, seleccion);
  const numeros = elTotalDelPropietario({ p, ajustada, seleccion });
  const conInmueblesFuera = inmuebles.filter((i) =>
    seleccion.inmueblesFuera.has(i.propertyId),
  ).length;

  return (
    <li
      className={cn('px-4 py-3', !dentro && 'bg-surface-muted/40')}
      data-testid="fila-propietario"
      data-propietario={p.propietarioId}
      data-dentro={dentro ? 'si' : 'no'}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={marcado}
          onCheckedChange={onAlternar}
          aria-label={`Girarle a ${p.propietarioName}`}
          className="mt-1"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className={cn('font-medium text-fg', !dentro && 'text-fg-muted')}>
              {p.propietarioName}
            </p>
            {/* Sin cuenta registrada se DICE. Antes se fabricaba una —banco
                «bancolombia», cuenta «****0000»—: en una pantalla sobre a dónde
                girar plata, un dato inventado se ve igual que uno real. */}
            <span className="text-xs text-fg-muted">
              {p.propietarioBankAccount
                ? `${p.propietarioBankName ?? 'Cuenta'} ${p.propietarioBankAccount}`
                : 'Sin cuenta registrada'}
            </span>
          </div>

          {varios ? (
            <button
              type="button"
              onClick={onAlternarDetalle}
              aria-expanded={abierto}
              className="mt-0.5 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-primary"
              data-testid="abrir-inmuebles"
            >
              {abierto ? (
                <CaretDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {inmuebles.length} inmuebles
              {conInmueblesFuera > 0 && (
                <span className="text-warning">
                  · {conInmueblesFuera} sin girar
                </span>
              )}
            </button>
          ) : (
            <p className="mt-0.5 truncate text-sm text-fg-muted">
              {inmuebles[0]?.titulo ?? p.items[0]?.propertyTitle ?? '—'}
            </p>
          )}
        </div>

        <div className="text-right">
          <p
            className={cn(
              'font-semibold tabular-nums',
              dentro ? 'text-fg' : 'text-fg-muted line-through',
            )}
            data-testid="neto-del-propietario"
          >
            {formatCurrency(numeros.netoCop)}
          </p>
          <p className="text-xs text-fg-muted tabular-nums">
            {ROTULO_DEL_CANON[base]} {formatCurrency(numeros.canonCop)} · comisión{' '}
            {formatCurrency(numeros.comisionCop)}
          </p>
        </div>
      </div>

      {/* Los inmuebles del propietario, con su plata y su casilla. Van acá, en
          la misma pantalla: eran el paso 2 y el paso 4 del asistente. */}
      {varios && abierto && (
        <ul className="ml-8 mt-2 space-y-1 border-l border-border-faint pl-3">
          {inmuebles.map((inm) => {
            const renglones = p.items.filter((i) => i.propertyId === inm.propertyId);
            const canon = renglones.reduce((s, i) => s + i.rentCollected, 0);
            const comision = renglones.reduce((s, i) => s + i.commissionAmount, 0);
            const neto = renglones.reduce((s, i) => s + i.netAmount, 0);
            const marcadoInm = !seleccion.inmueblesFuera.has(inm.propertyId);
            return (
              <li
                key={inm.propertyId}
                className="flex items-center gap-3 text-sm"
                data-testid="fila-inmueble"
                data-inmueble={inm.propertyId}
              >
                <Checkbox
                  checked={marcadoInm}
                  disabled={!marcado}
                  onCheckedChange={() => onAlternarInmueble(inm.propertyId)}
                  aria-label={`Girar ${inm.titulo}`}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    marcadoInm && marcado ? 'text-fg' : 'text-fg-muted',
                  )}
                >
                  {inm.titulo}
                </span>
                <span className="tabular-nums text-fg-muted">
                  comisión {formatCurrency(comision)}
                </span>
                <span
                  className={cn(
                    'w-28 text-right tabular-nums',
                    marcadoInm && marcado ? 'font-medium text-fg' : 'text-fg-muted line-through',
                  )}
                  data-testid="neto-del-inmueble"
                >
                  {formatCurrency(neto)}
                </span>
                <span className="sr-only">
                  {ROTULO_DEL_CANON[base]} {formatCurrency(canon)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default GenerarDispersion;
