'use client';

/**
 * El tablero financiero: lo que finanzas mira TODOS los días.
 *
 * Cuatro bloques, que son las cuatro preguntas de la mañana:
 *
 *   1. ¿Cuánto entró hoy y cuánto va del mes contra lo que el mes hizo deber?
 *   2. ¿Cuánto nos deben, de qué edad, y quiénes son los que pesan?
 *   3. ¿Cuánto hay que girarle a los propietarios y cuánto está trabado?
 *   4. ¿Cuánto ganó la inmobiliaria con su propia plata, después de costos?
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Pintar un `null` como un cero.** La tasa de recaudo, la variación
 *    contra el mes anterior y el margen % vienen `number | null`: el `null`
 *    es «no había contra qué medir», no «dio cero». Se pinta `—` y la
 *    definición dice por qué (`@/lib/tasas`).
 * 2. **Esconder los `avisos`.** Van arriba, antes de las cifras. Un número que
 *    calla lo que NO cuenta —contratos sin tabla de amortización, cuotas sin
 *    sede— miente por omisión, y quien lo lee toma decisiones con él.
 * 3. **Sumar la deuda con la cartera.** El back manda `cartera.totalCop` y sus
 *    tramos: son la cartera, lo que ya pasó el plazo. La deuda del contrato
 *    —que es 12,9 veces más grande— vive en `/pagos/cartera` y no se mezcla.
 * 4. **Callar qué parte de la cartera está en siniestro.** El back la saca
 *    del total y de los tramos (`carteraDelTablero`) y se dice APARTE: ya no
 *    la persigue la cobranza, la reclama la aseguradora. (CONSISTENCIA,
 *    04-10-2026: el pie decía «De eso, $104 M está en siniestro» debajo de
 *    una cartera de $102 M.)
 * 5. **Dejar una cifra sin definición.** Cada una dice qué mide, debajo.
 *
 * ── GLOW UP (Nico, 20-10-2026) ──────────────────────────────────────────────
 *
 * Eran dieciocho tarjetas del mismo peso, cada una con su párrafo: la cifra que
 * contesta cada pregunta no se distinguía de las que la explican, y la pantalla
 * medía dos metros y medio. Ahora cada pregunta es UNA tarjeta
 * (`TarjetaDeCifras`): su respuesta grande, sus cifras de apoyo al lado, y qué
 * mide cada una plegado detrás de «Qué mide cada cifra» (sigue en la pantalla:
 * la regla 5 vale igual). La cartera se lee en una barra por edades y lo que
 * gana la inmobiliaria, como la cuenta que es: se suma, se resta y da.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Progress } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import {
  Avisos,
  Cifra,
  FilaDeCifras,
  RenglonDeCifra,
  TarjetaDeCifras,
} from '@/components/finanzas/piezas';
import { SelectorDeMes, conMayusculaInicial } from '@/components/finanzas/SelectorDeMes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FIJAR_EL_PLAZO_HREF } from '@/lib/api/cobranza-secuencia.types';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { TableroFinanciero as Tablero, TramoDeCartera } from '@/lib/api/finanzas.types';
import { mesActual, nombreDelMes } from '@/lib/recaudo/meses';
import {
  definicionDePorGirar,
  rotuloDePorGirar,
  rotuloDeProximosGiros,
} from '@/lib/propietarios/por-girar';
import { SIN_MEDIR, tasaEnPantalla } from '@/lib/tasas';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { plataPareja } from '@/lib/format';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { cifrasDeLaPantalla } from '@/lib/i18n/idioma-de-las-cifras';
import { useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';

const NUMERO = cifrasDeLaPantalla();

/** Cómo se lee cada etapa de cobranza. Lo que no esté, se muestra tal cual. */
const NOMBRE_DE_LA_ETAPA: Record<string, string> = {
  TEMPRANA: 'Temprana',
  ADMINISTRATIVA: 'Administrativa',
  PREJURIDICA: 'Prejurídica',
  JURIDICA: 'Jurídica',
};

/** Qué significa cada etapa, para el encabezado de la columna. */
const QUE_ES_LA_ETAPA =
  'Temprana: recién pasó el plazo · Administrativa: la persigue la cobranza · ' +
  'Prejurídica: última instancia antes del abogado · Jurídica: ya está en manos del abogado.';

/**
 * Qué dice la tarjeta de un tramo debajo del monto.
 *
 * 🔴 Antes armaba el rango con `desdeDias`/`hastaDias`, que EL BACK NO MANDA:
 * en pantalla salía «undefined-undefined días de mora» en las cuatro tarjetas
 * de «Cartera por edades». El rango ya viene escrito en `tramo.nombre` («0-30
 * días»), que es el rótulo de la tarjeta, así que repetirlo abajo tampoco
 * aportaba nada: lo que falta decir es cuántas cuotas son y desde dónde se
 * cuentan los días, que no es obvio.
 */
export function definicionDelTramo(
  tramo: Pick<TramoDeCartera, 'cuotas'>,
): string {
  const cuotas = `${NUMERO.format(tramo.cuotas)} ${tramo.cuotas === 1 ? 'cuota' : 'cuotas'}`;
  return `${cuotas} en mora. Los días se cuentan DESPUÉS del plazo del contrato.`;
}

/**
 * La variación del recaudo contra el mes anterior, en palabras.
 *
 * `null` → `—`: sin recaudo el mes pasado no hay contra qué comparar, y un
 * «0 %» ahí diría que el mes viene igual.
 */
export function textoDeLaVariacion(variacionPct: number | null): string {
  if (variacionPct === null || !Number.isFinite(variacionPct)) return SIN_MEDIR;
  // TB-04: «+4,2 %» como se escribe en Colombia (antes «+4.2%»).
  return tasaEnPantalla(variacionPct, 1, { conSigno: true });
}

/**
 * 🔴 N-06 (QA-PAGOS-95, 05-10-2026): «% recaudado 9,7 %» al lado de «Entró en
 * el mes $ 31.191.000» y «Se debe del mes $ 162.341.531» no se podía rehacer
 * (31,2 ÷ 162,3 = 19,2 %): el porcentaje mide lo que entró a las cuotas DEL
 * MES, no la caja del mes. Con el numerador del back, la tarjeta dice cuánto
 * de cuánto y por qué no es lo de «Entró en el mes».
 */
export function definicionDeLaTasa(
  recaudo: Tablero['recaudo'],
  mes: string,
  base: string,
  /** El formato de la plata de la página (ronda 11: un solo formato en todo el tablero). */
  formato: (n: number) => string = formatCurrency,
): string {
  if (recaudo.abonadoDelMesCop == null) return `Qué parte de ${base} llegó. ${recaudo.rotulo}`;
  const deQue = recaudo.base === 'EMITIDO' ? 'de los cobros emitidos de' : 'de las cuotas de';
  return (
    `${formato(recaudo.abonadoDelMesCop)} de ${formato(recaudo.causadoDelMesCop)} ` +
    `${deQue} ${nombreDelMes(mes)} ya entraron. No es lo de «Entró en el mes»: ése cuenta también lo que se pagó de otros meses.`
  );
}

export function TableroFinancieroPanel() {
  const tr = useTr();
  const [mes, setMes] = useState(() => mesActual());
  const [sedeId, setSedeId] = useState('');
  const [tablero, setTablero] = useState<Tablero | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setTablero(await finanzasApi.tablero(mes, sedeId || null));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [mes, sedeId]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    finanzasApi
      .tablero(mes, sedeId || null)
      .then((t) => {
        if (vivo) setTablero(t);
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
  }, [mes, sedeId]);

  const sedes = tablero?.sedes ?? [];
  // 22-10 (revisión): UN «Qué mide cada cifra» para las cuatro tarjetas.
  const [queMide, setQueMide] = useState(false);

  return (
    <div className="space-y-6" data-testid="tablero-financiero">
      {/* 🔴 El alcance DICE qué gobierna (Nico, 21-09: «todo súper separado»).
          GLOW UP (20-10): va en el encabezado, a la derecha del título, en una
          sola pieza: mes y sede mandan sobre TODO el tablero, no sobre el
          primer bloque. La sede sólo aparece si la inmobiliaria tiene sedes. */}
      <EncabezadoDePantalla
        seccion={tr('Finanzas')}
        titulo={tr('Tablero financiero')}
        descripcion={tr(
          'Lo que entró, lo que deben, lo que hay que girar y lo que ganó la inmobiliaria en el mes.',
        )}
        ayuda={
          <button
            type="button"
            aria-pressed={queMide}
            onClick={() => setQueMide((v) => !v)}
            className="rounded-full text-body-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="tablero-que-mide"
          >
            {queMide ? tr('Ocultar qué mide cada cifra') : tr('Qué mide cada cifra')}
          </button>
        }
        acciones={
          <div
            className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-surface py-0.5 pl-1 pr-1"
            data-testid="alcance-del-tablero"
            aria-label={tr('Todo el tablero, de')}
            role="group"
          >
            <SelectorDeMes mes={mes} onCambiar={setMes} />
            {sedes.length > 0 ? (
              <>
                <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
                <select
                  aria-label={tr('Sede')}
                  data-testid="selector-de-sede"
                  className="h-9 rounded-full border-0 bg-transparent px-3 text-body-sm font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                >
                  <option value="">Consolidado (todas)</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.codigo})
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
        }
      />

      <EstadoDeDatos
        cargando={cargando && !tablero}
        error={error}
        queEs="el tablero financiero"
        onReintentar={cargar}
        conservarContenido={Boolean(tablero)}
      >
        {tablero ? (
          <div className="space-y-5">
            <Avisos
              avisos={tablero.avisos}
              testId="avisos-del-tablero"
              titulo="Lo que estos números no cuentan"
            />

            {/* GLOW UP (revisión de Dinero, 22-10-2026): eran 19 cifras del mismo
                peso en cuatro franjas a lo ancho. Ahora son las cuatro preguntas de
                la mañana en 2×2: cada tarjeta con UNA cifra grande, lo que la
                explica en renglones y su enlace; un renglón en cero no se pinta. */}
            <div className="grid gap-5 lg:grid-cols-2">
              <BloqueDeRecaudo tablero={tablero} queMide={queMide} />
              <BloqueDeCartera tablero={tablero} queMide={queMide} />
              <BloqueDePropietarios tablero={tablero} queMide={queMide} />
              <BloqueDeMargen tablero={tablero} queMide={queMide} />
            </div>
            <BloqueDeDeudores tablero={tablero} />

            <p className="text-caption text-fg-muted">
              {/* PG-13 (03-10-2026): la fecha de la casa, no «2026-10-03». */}
              Datos al {fechaLarga(tablero.hoy)} (hora de Bogotá).{' '}
              {tablero.sedeId === null
                ? 'Consolidado de todas las sedes.'
                : `Sólo la sede ${sedes.find((s) => s.id === tablero.sedeId)?.nombre ?? tablero.sedeId}.`}
            </p>
          </div>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}

/** El enlace de la esquina de una tarjeta: a dónde se va a hacer algo con esas cifras. */
function EnlaceDelBloque({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-body-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}

// ══ (a) Recaudo ═════════════════════════════════════════════════════════════

function plataDelTablero(t: Tablero) {
  return plataPareja([
    t.recaudo.delMesCop, t.recaudo.delDiaCop, t.recaudo.causadoDelMesCop, t.recaudo.abonadoDelMesCop,
    t.cartera.totalCop, t.cartera.enSiniestroCop, ...t.cartera.tramos.map((x) => x.carteraCop),
    t.propietarios.porGirarCop, t.propietarios.retenidoCop, t.propietarios.enLotesPorAprobarCop,
    t.propietarios.giradoDelMesCop, t.propietarios.proximosGiros?.totalCop,
    t.margen.margenCop, t.margen.comisionesCop, t.margen.interesesCop, t.margen.gastosDeCobranzaCop,
    t.margen.ingresosPropiosCop, t.margen.gmfCop, t.margen.pasarelaCop, t.margen.costosCop,
    // Ronda 11: «Los que más deben» también, para que no salga sin decimales al lado de «,00».
    ...t.cartera.deudores.map((d) => d.saldoCop),
  ]);
}

function Renglones({ children }: { children: ReactNode }) {
  return <div className="border-t border-border px-5 py-2">{children}</div>;
}

function BloqueDeRecaudo({ tablero, queMide }: { tablero: Tablero; queMide: boolean }) {
  const tr = useTr();
  const { recaudo } = tablero;
  // Los mismos decimales en TODO el tablero (revisión 22-10: las cuatro cifras héroe no coincidían).
  const plata = plataDelTablero(tablero);
  const base =
    recaudo.base === 'EMITIDO'
      ? 'lo que se emitió en cobros'
      : 'lo que el mes hizo deber (lo causado)';
  const tasaMedida = recaudo.tasaPct !== null && Number.isFinite(recaudo.tasaPct);

  return (
    <TarjetaDeCifras
      queMideDesdeAfuera={queMide}
      testId="bloque-recaudo"
      className="flex h-full flex-col"
      titulo={tr('Recaudo')}
      pregunta={tr('¿Cuánto entró, y qué parte de lo del mes ya llegó?')}
      explicacion={`Cuánto entró por caja hoy y en el mes, contra ${base}. Así lo mide esta inmobiliaria: ${recaudo.rotulo}`}
      accion={
        <EnlaceDelBloque href="/panel/inmobiliaria/pagos/recaudo">{tr('Ver el recaudo')}</EnlaceDelBloque>
      }
    >
      <FilaDeCifras>
        <Cifra
          formato={plata}
          id="recaudo-del-mes"
          etiqueta="Entró en el mes"
          valor={recaudo.delMesCop}
          destacada
          definicion="Todo lo que entró por caja en el mes seleccionado, sin importar de qué mes era la deuda."
          extra={
            tasaMedida ? (
              <Progress
                value={Math.min(Math.max(recaudo.tasaPct as number, 0), 100)}
                size="xs"
                color={(recaudo.tasaPct as number) >= 100 ? 'success' : 'primary'}
                label={tr('Qué parte de lo del mes ya llegó')}
                className="mt-2"
              />
            ) : null
          }
        />
      </FilaDeCifras>
      <Renglones>
        <RenglonDeCifra
          id="tasa-de-recaudo"
          etiqueta="Ya llegó de lo del mes"
          valor={tasaMedida ? (recaudo.tasaPct as number) : null}
          formato={(n) => tasaEnPantalla(n)}
          definicion={definicionDeLaTasa(recaudo, tablero.mes, base, plata)}
          // 22-10 (revisión): sin recaudo el mes anterior no hay contra qué comparar; no se pinta la frase.
          pie={
            (recaudo.mesAnterior.causadoCop ?? 0) === 0 && (recaudo.mesAnterior.recaudadoCop ?? 0) === 0 ? undefined : (
            <span data-testid="comparacion-mes-anterior">
              {conMayusculaInicial(nombreDelMes(recaudo.mesAnterior.mes))}:{' '}
              {/* N-06: con el numerador del back, el mismo con que se sacó su %. */}
              {plata(recaudo.mesAnterior.abonadoCop ?? recaudo.mesAnterior.recaudadoCop)} de{' '}
              {plata(recaudo.mesAnterior.causadoCop)} ({tasaEnPantalla(recaudo.mesAnterior.tasaPct)}).
              Variación:{' '}
              <span data-testid="variacion-del-recaudo">{textoDeLaVariacion(recaudo.variacionPct)}</span>
              {/* TB-04: un solo guion (antes «— —»). */}
              {recaudo.variacionPct === null
                ? '. El mes anterior no recaudó nada, así que no hay contra qué comparar.'
                : '.'}
            </span>
            )
          }
        />
        <RenglonDeCifra
          formato={plata}
          id="causado-del-mes"
          etiqueta="Se debe del mes"
          valor={recaudo.causadoDelMesCop}
          definicion={`${conMayusculaInicial(base)} en el mes. Es el denominador del porcentaje.`}
        />
        {recaudo.delDiaCop === 0 ? null : (
        <RenglonDeCifra
          formato={plata}
          id="recaudo-del-dia"
          etiqueta="Entró hoy"
          valor={recaudo.delDiaCop}
          definicion={`Los recibos de caja con fecha ${fechaLarga(tablero.hoy)}, de cualquier período.`}
        />
        )}
      </Renglones>
    </TarjetaDeCifras>
  );
}

/**
 * El color de cada tramo de edad: de ámbar suave a rojo. El último (el más viejo)
 * es el más grave.
 */
function colorDelTramo(i: number, total: number): { clase: string; opacidad: number } {
  if (i === total - 1) return { clase: 'bg-danger', opacidad: 1 };
  const pasos = [0.35, 0.6, 0.85];
  return { clase: 'bg-warning', opacidad: pasos[Math.min(i, pasos.length - 1)] };
}

function MarcaDelTramo({ i, total }: { i: number; total: number }) {
  const { clase, opacidad } = colorDelTramo(i, total);
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', clase)}
      style={{ opacity: opacidad }}
      aria-hidden="true"
    />
  );
}

function BloqueDeCartera({ tablero, queMide }: { tablero: Tablero; queMide: boolean }) {
  const tr = useTr();
  const { cartera } = tablero;
  // Los mismos decimales en TODO el tablero (revisión 22-10: las cuatro cifras héroe no coincidían).
  const plata = plataDelTablero(tablero);
  const sumaDeTramos = cartera.tramos.reduce((a, t) => a + Math.max(t.carteraCop, 0), 0);
  return (
    <TarjetaDeCifras
      queMideDesdeAfuera={queMide}
      testId="bloque-cartera"
      className="flex h-full flex-col"
      titulo={tr('Cartera por edades')}
      pregunta={tr('¿Cuánto pasó el plazo, y de qué edad?')}
      explicacion="Lo que ya pasó el plazo del contrato, partido por los días DESPUÉS del plazo. No es la deuda total: lo que todavía no vence y lo vencido dentro del plazo no se persiguen."
      accion={
        <EnlaceDelBloque href="/panel/inmobiliaria/pagos/cartera">{tr('Ver la cartera')}</EnlaceDelBloque>
      }
    >
      <FilaDeCifras>
        <Cifra
          formato={plata}
          id="cartera-total"
          etiqueta="Cartera"
          valor={cartera.totalCop}
          destacada
          definicion="El capital que pasó el plazo y todavía persigue la cobranza. Es la suma de los tramos; lo que está en siniestro va aparte."
          tono={cartera.totalCop > 0 ? 'warning' : undefined}
          pie={
            cartera.enSiniestroCop > 0 ? (
              <span data-testid="cartera-en-siniestro">
                Aparte, {plata(cartera.enSiniestroCop)} en siniestro: lo reclama la
                aseguradora, no la cobranza.
              </span>
            ) : undefined
          }
          extra={
            sumaDeTramos > 0 ? (
              <div
                className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-muted"
                role="img"
                aria-label={cartera.tramos
                  .map((t) => `${t.nombre}: ${plata(t.carteraCop)}`)
                  .join(' · ')}
                data-testid="barra-por-edades"
              >
                {cartera.tramos.map((t, i) => {
                  const { clase, opacidad } = colorDelTramo(i, cartera.tramos.length);
                  const ancho = (Math.max(t.carteraCop, 0) / sumaDeTramos) * 100;
                  if (ancho <= 0) return null;
                  return (
                    <span
                      key={t.tramo}
                      className={cn('h-full transition-[width] duration-slow ease-emphasis', clase)}
                      style={{ width: `${ancho}%`, opacity: opacidad }}
                    />
                  );
                })}
              </div>
            ) : null
          }
        />
      </FilaDeCifras>
      {cartera.plazoSinFijar && (
        <div
          className="flex items-start gap-2.5 border-t border-border px-5 py-3 text-body-sm text-fg"
          data-testid="cartera-plazo-sin-fijar"
        >
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
          <p>
            La cartera está en cero porque esta inmobiliaria todavía no fijó sus días de plazo: sin
            plazo, lo vencido se ve como «Vencida», no corre mora y no entra a la cobranza.{' '}
            <Link
              href={FIJAR_EL_PLAZO_HREF}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Fijar los días de plazo
            </Link>
          </p>
        </div>
      )}
      <Renglones>
        {cartera.tramos.map((tramo, i) => (
          <RenglonDeCifra
            key={tramo.tramo}
            id={`tramo-${tramo.tramo}`}
            etiqueta={
              <>
                {tramo.nombre}
                <span className="ml-2 font-mono text-caption tabular-nums text-fg-subtle">
                  {NUMERO.format(tramo.cuotas)} {tramo.cuotas === 1 ? 'cuota' : 'cuotas'}
                </span>
              </>
            }
            marca={<MarcaDelTramo i={i} total={cartera.tramos.length} />}
            formato={plata}
            valor={tramo.carteraCop}
            definicion={definicionDelTramo(tramo)}
          />
        ))}
      </Renglones>
    </TarjetaDeCifras>
  );
}

/**
 * Los que más deben, a lo ancho debajo de las cuatro preguntas: es una lista para
 * actuar (a quién llamar primero), no una cifra. Bajo 768 cada deudor es una tarjeta.
 */
function BloqueDeDeudores({ tablero }: { tablero: Tablero }) {
  const tr = useTr();
  const { cartera } = tablero;
  const plata = plataDelTablero(tablero);
  return (
    <section
      className="overflow-hidden rounded-[20px] border border-border bg-surface"
      data-testid="bloque-deudores"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pb-3 pt-5">
        <h2 className="text-h3 text-fg">{tr('Los que más deben')}</h2>
        <p className="max-w-xl text-caption text-fg-muted">{QUE_ES_LA_ETAPA}</p>
      </div>
      <Table className="max-md:block">
        <TableHeader className="max-md:hidden">
          <TableRow>
            <TableHead>Inquilino</TableHead>
            <TableHead className="text-right">Debe</TableHead>
            <TableHead className="text-right">Días de mora</TableHead>
            <TableHead>Etapa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="max-md:block">
          {cartera.deudores.length === 0 ? (
            <TableRow className="max-md:block">
              <TableCell colSpan={4} className="py-10 text-center text-sm text-fg-muted max-md:block">
                Nadie tiene cartera vencida en este corte. No es un error: es una cartera en cero.
              </TableCell>
            </TableRow>
          ) : (
            cartera.deudores.map((d, i) => (
              <TableRow
                key={d.clienteId ?? `${d.nombre}-${i}`}
                data-testid="fila-deudor"
                className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-5 max-md:py-3"
              >
                <TableCell className="max-md:block max-md:p-0">
                  <p className="font-medium text-fg">{d.nombre}</p>
                  <p className="font-mono text-caption text-fg-subtle">{d.documento || '—'}</p>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums max-md:block max-md:p-0">
                  {plata(d.saldoCop)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-fg-muted max-md:col-start-1 max-md:block max-md:p-0 max-md:text-left max-md:text-caption">
                  {NUMERO.format(d.diasDeMora)}
                  <span className="md:hidden"> {d.diasDeMora === 1 ? 'día' : 'días'} de mora</span>
                </TableCell>
                <TableCell className="text-fg-muted max-md:block max-md:p-0 max-md:text-right max-md:text-caption">
                  {NOMBRE_DE_LA_ETAPA[d.etapa] ?? d.etapa}
                </TableCell>

              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function BloqueDePropietarios({ tablero, queMide }: { tablero: Tablero; queMide: boolean }) {
  const tr = useTr();
  const { propietarios } = tablero;
  // Los mismos decimales en TODO el tablero (revisión 22-10: las cuatro cifras héroe no coincidían).
  const plata = plataDelTablero(tablero);
  return (
    <TarjetaDeCifras
      queMideDesdeAfuera={queMide}
      testId="bloque-propietarios"
      className="flex h-full flex-col"
      titulo={tr('Plata de los propietarios')}
      pregunta={tr('¿Cuánto hay que girarles, y qué está trabado?')}
      explicacion="Lo que les toca, en qué estado está y qué está trabado. Lo retenido no es plata nuestra: es de ellos y no les llegó."
      accion={
        <EnlaceDelBloque href="/panel/inmobiliaria/pagos/dispersiones">{tr('Ir a los giros')}</EnlaceDelBloque>
      }
    >
      <FilaDeCifras>
        {/* 🔴 «Por girar» → UNA sola cifra: hasta el mes EN CURSO, aunque el
            tablero mire otro mes (Nico, 04-10-2026). La manda el back con la
            misma función de las otras pantallas. */}
        <Cifra
          formato={plata}
          id="por-girar"
          etiqueta={rotuloDePorGirar(propietarios.porGirarHastaMes ?? tablero.mes)}
          valor={propietarios.porGirarCop}
          destacada
          definicion={definicionDePorGirar(propietarios.porGirarHastaMes ?? tablero.mes)}
        />
      </FilaDeCifras>
      <Renglones>
        {propietarios.lotesPorAprobar > 0 || propietarios.enLotesPorAprobarCop > 0 ? (
          <RenglonDeCifra
            formato={plata}
            id="en-lotes-por-aprobar"
            etiqueta="En lotes por aprobar"
            valor={propietarios.enLotesPorAprobarCop}
            definicion={`Ya está armado en ${propietarios.lotesPorAprobar} ${propietarios.lotesPorAprobar === 1 ? 'lote' : 'lotes'} esperando aprobación: nadie lo ha autorizado todavía.`}
            pie={
              propietarios.lotesPorAprobar > 0 ? (
                <Link
                  href="/panel/inmobiliaria/pagos/dispersiones/lotes"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="ir-a-aprobar-lotes"
                >
                  {propietarios.lotesPorAprobar === 1
                    ? tr('Ver el lote por aprobar')
                    : tr('Ver los {n} lotes por aprobar', { n: propietarios.lotesPorAprobar })}
                </Link>
              ) : undefined
            }
          />
        ) : null}
        {propietarios.retenidoCop > 0 ? (
          <RenglonDeCifra
            formato={plata}
            id="retenido"
            etiqueta="Retenido"
            valor={propietarios.retenidoCop}
            definicion="Giros frenados por un cambio de cuenta bancaria sin aprobar o por una devolución del banco."
            tono="warning"
          />
        ) : null}
        <RenglonDeCifra
          formato={plata}
          id="girado-del-mes"
          etiqueta={`Girado en ${nombreDelMes(tablero.mes)}`}
          valor={propietarios.giradoDelMesCop}
          definicion="Lo que salió al banco ese mes, por el día en que salió: lotes marcados como pagados y dispersiones procesadas una a una. Es el mismo «Dispersado» de Recaudo."
        />
        {propietarios.proximosGiros ? (
          <RenglonDeCifra
            formato={plata}
            id="proximos-giros"
            etiqueta={rotuloDeProximosGiros(
              propietarios.proximosGiros.desdeMes,
              propietarios.proximosGiros.hastaMes,
            )}
            valor={propietarios.proximosGiros.totalCop}
            definicion="Lo de los meses siguientes al mes en curso. Va aparte: todavía no se debe girar y no se suma a «Por girar»."
          />
        ) : null}
      </Renglones>
    </TarjetaDeCifras>
  );
}

function BloqueDeMargen({ tablero, queMide }: { tablero: Tablero; queMide: boolean }) {
  const tr = useTr();
  const { margen } = tablero;
  // Los mismos decimales en TODO el tablero (revisión 22-10: las cuatro cifras héroe no coincidían).
  const plata = plataDelTablero(tablero);
  return (
    <TarjetaDeCifras
      queMideDesdeAfuera={queMide}
      testId="bloque-margen"
      className="flex h-full flex-col"
      titulo={tr('Lo que gana la inmobiliaria')}
      pregunta={tr('¿Cuánto le quedó, después de lo que cuesta mover la plata?')}
      explicacion="Ingresos propios del mes menos los costos de mover la plata que la inmobiliaria asume. Lo que se le traslada al propietario o al inquilino NO entra acá: no es costo suyo."
    >
      <FilaDeCifras>
        <Cifra
          formato={plata}
          id="margen"
          etiqueta="Margen"
          valor={margen.margenCop}
          destacada
          definicion="Ingresos propios menos costos de la plata."
          tono={margen.margenCop < 0 ? 'danger' : undefined}
          pie={
            <span data-testid="margen-pct">
              {margen.margenPct === null
                ? `${SIN_MEDIR} sobre ingresos: no hubo ingresos propios contra los cuales medirlo.`
                : `${tasaEnPantalla(margen.margenPct)} de los ingresos propios.`}
            </span>
          }
        />
      </FilaDeCifras>
      {/* Se lee como la cuenta que es: lo que entra, lo que sale, lo que queda.
          Un renglón en cero no se pinta; los subtotales sí. */}
      <Renglones>
        {margen.comisionesCop !== 0 ? (
          <RenglonDeCifra
            formato={plata}
            id="comisiones"
            etiqueta="Comisiones"
            valor={margen.comisionesCop}
            definicion="Comisión de administración CAUSADA en el mes, se haya cobrado o no."
          />
        ) : null}
        {margen.interesesCop !== 0 ? (
          <RenglonDeCifra
            formato={plata}
            id="intereses"
            etiqueta="Intereses de mora"
            valor={margen.interesesCop}
            definicion="Interés de mora RECAUDADO en el mes. Sólo el que le queda a la inmobiliaria según el mandato."
          />
        ) : null}
        {margen.gastosDeCobranzaCop !== 0 ? (
          <RenglonDeCifra
            formato={plata}
            id="gastos-de-cobranza"
            etiqueta="Gastos de cobranza"
            valor={margen.gastosDeCobranzaCop}
            definicion="Lo que se le cobró al inquilino por la gestión de cobro y entró por caja en el mes."
          />
        ) : null}
        {/* 22-10 (revisión): el subtotal sólo con dos o más componentes; con uno, repetía la cifra. */}
        {[margen.comisionesCop, margen.interesesCop, margen.gastosDeCobranzaCop].filter((v) => v !== 0).length >= 2 ? (
        <RenglonDeCifra
          formato={plata}
          id="ingresos-propios"
          etiqueta="Ingresos propios"
          valor={margen.ingresosPropiosCop}
          subtotal
          definicion="Comisiones, intereses y gastos de cobranza. No incluye el canon: ese es del propietario."
        />
        ) : null}
        {margen.gmfCop !== 0 ? (
          <RenglonDeCifra
            formato={plata}
            id="gmf"
            etiqueta="4×1000"
            valor={margen.gmfCop}
            signo="-"
            definicion="Sólo la parte que asume la inmobiliaria. Lo que se traslada al propietario sale en su liquidación y no es costo nuestro."
          />
        ) : null}
        {margen.pasarelaCop !== 0 ? (
          <RenglonDeCifra
            formato={plata}
            id="pasarela"
            etiqueta="Pasarela de pago"
            valor={margen.pasarelaCop}
            signo="-"
            definicion="Sólo la parte que asume la inmobiliaria. Lo que se traslada al inquilino va como línea aparte de su recibo."
          />
        ) : null}
        {[margen.gmfCop, margen.pasarelaCop].filter((v) => v !== 0).length >= 2 ? (
        <RenglonDeCifra
          formato={plata}
          id="costos"
          etiqueta="Costos de la plata"
          valor={margen.costosCop}
          signo="-"
          subtotal
          definicion="4×1000 más pasarela, de lo que asume la inmobiliaria."
        />
        ) : null}
      </Renglones>
    </TarjetaDeCifras>
  );
}
