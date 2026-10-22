'use client';

/**
 * Recaudo — cuánto llegó, cuánto falta, cuánto salió y cuánto queda en la
 * mano, mes por mes.
 *
 * Antes esto estaba repartido: `/cobros` muestra el mes corriente, `/cartera`
 * la deuda por edad, `/dispersiones` lo que sale y `/tesoreria` explica el
 * neto con un ejemplo. Acá están las cuatro cifras juntas, y debajo de cada
 * una está escrito de qué se compone — la definición vive en el back
 * (`recaudo.service.ts`) y esta pantalla la repite, no la reinterpreta.
 *
 * ── Las listas son LA tabla de la casa (Nico, 2026-09-03) ───────────────────
 * «Esto no tiene las tablas de como lo manejamos nosotros.» Lo que el back
 * manda como lista —los doce meses de la serie y los recibos del mes por
 * medio de pago— se pinta con `Table` de `@/components/ui/table` dentro de
 * la tarjeta estándar, sin título encima (no se nombran las tablas), con el
 * vacío adentro del `<TableBody>` y carga/fallo por `EstadoDeDatos`.
 *
 * El endpoint (`GET /inmobiliaria/recaudo/{resumen,serie}`) devuelve
 * agregados: no hay una lista recibo por recibo ni giro por giro del mes.
 * Esa lista vive en `/pagos/recibos` (recibos de caja y egresos, 15-10-2026).
 *
 * ── 🔴 Lo que cambió el 2026-09-16: la deuda ya no sale de los cobros ──────
 *
 * «Pendiente» decía *«Saldo de los N cobros del mes sin pagar»*. El back dejó
 * de contar cobros y pasó a contar CUOTAS del contrato, así que ese rótulo se
 * volvió una mentira aritmética: con 0 cobros emitidos habría dicho
 * **«0 cobros: $1.251 millones»**. La deuda nace con el contrato; el cobro es
 * el documento con el que finanzas reclama una parte de ella, y puede no
 * existir —en la inmobiliaria migrada no existe para ninguna de sus 30.951
 * cuotas—.
 *
 * De ahí tres cosas en esta pantalla:
 *
 *   1. «Se debe» reemplaza a «Facturado» como la cifra de referencia, y es el
 *      denominador de «% recaudado»: qué parte de lo que el mes hizo deber
 *      llegó. Sobre lo facturado, el porcentaje hablaba de los documentos
 *      emitidos, no del negocio.
 *   2. «Pendiente» y «En mora» se cuentan en CUOTAS (`cuotasPendientes`,
 *      `cuotasEnCartera`), no en cobros.
 *   3. Los cobros no desaparecen: siguen en su propia línea, rotulados como lo
 *      que son —documentos emitidos— y con el `0` dicho con palabras, porque
 *      «no hay documento» no significa «no se debe nada».
 *
 * Lo que la pantalla se niega a hacer:
 *   - Mostrar un mes futuro. No hay nada que ver ahí.
 *   - Confundir «no llegó nada» con «no pudimos preguntar».
 *   - Recortar un «disponible» negativo: si se giró plata que nunca pasó
 *     por un recibo, el número lo dice.
 *   - 🔴 Decir «nada que contar» sobre un mes que SÍ hace deber plata. Un mes
 *     sin cobros, sin recibos y sin giros pero con cuotas es un mes normal de
 *     la inmobiliaria migrada, no un mes vacío.
 *
 * ── La comparativa con el mes anterior (Nico, 2026-09-25) ───────────────────
 *
 * Debajo de cada cifra va el «% vs mes anterior» A LA MISMA FECHA (día N
 * contra día N), y después de las cifras el recaudo día a día de los dos meses
 * y la proyección del cierre. Todo sale de `GET …/recaudo/comparativa` por un
 * hook APARTE (`useComparativaDelRecaudo`): si esa lectura falla, las cifras
 * siguen y sólo la comparación dice «no se pudo leer». El detalle —qué nunca
 * se muestra como «0 %» ni «$ 0»— está en `ComparativaDelMes.tsx`.
 */

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CaretLeft, CaretRight, Coins, Receipt } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableBodyAnimado,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table';
import { AnimatedNumber, Appear, Presence } from '@leasefy/cadence';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { SinDatos } from '@/components/estado/SinDatos';
import type { PuntoDeLaSerie, ResumenDeRecaudo } from '@/lib/api/recaudo.types';
import { formatCurrency, plataPareja } from '@/lib/format';
import { useRecaudo } from '@/lib/hooks/use-recaudo';
import { useComparativaDelRecaudo } from '@/lib/hooks/use-comparativa-del-recaudo';
import { esFuturo, mesActual, nombreDelMes, sumarMeses } from '@/lib/recaudo/meses';
import { normalizarMedio } from '@/lib/finanzas/medios';
import { cn } from '@/lib/utils';
import { GraficoDeRecaudo } from './GraficoDeRecaudo';
import {
  ComparativaDelMes,
  VsMesAnterior,
  sinComparacionEnNinguna,
  soloElMes,
  type SentidoDeLaCifra,
} from './ComparativaDelMes';
import { useLocaleDelPanel, useTr } from '@/lib/i18n/use-tr';
import { cifrasDeLaPantalla } from '@/lib/i18n/idioma-de-las-cifras'

const formateadorDeNumero = cifrasDeLaPantalla();

/** Un conteo con separador de miles: «30.951». */
function numero(n: number): string {
  return formateadorDeNumero.format(n);
}

/** El singular o el plural según el conteo. Una «1 cuotas» delata la plantilla. */
function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

/** «septiembre de 2026» → «Septiembre de 2026». `capitalize` de CSS ponía «De» en mayúscula. */
function conMayusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const NOMBRE_DEL_MEDIO: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  PSE: 'PSE',
  CHEQUE: 'Cheque',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  TARJETA: 'Tarjeta',
  WOMPI: 'Wompi',
  CONCILIACION: 'Conciliación de saldo anterior',
  // PG-11 (03-10-2026): los del catálogo de caja que faltaban.
  ENLACE_DE_PAGO: 'Enlace de pago',
  CONSIGNACION: 'Consignación',
  OTRO: 'Otro',
  ANTICIPO: 'Anticipo del inquilino',
  SIN_MEDIO: 'Sin medio',
};

function nombreDelMedio(medio: string): string {
  return NOMBRE_DEL_MEDIO[medio] ?? medio;
}

/**
 * 🔴 PG-11 (QA de Pagos, 03-10-2026): «Cómo entró la plata de octubre» decía
 * «transferencia 6 · Transferencia 5 · pse 6» — el mismo medio partido por
 * mayúsculas y en minúscula cruda, porque se agrupaba por el TEXTO libre del
 * recibo. Se agrupa por el TIPO normalizado y se nombra con el nombre de la
 * casa. El back nuevo ya lo manda así (`medio` = tipo, con `nombre`); con un
 * back anterior esto lo arregla acá. Lo que no es un tipo conocido conserva su
 * texto: no se inventa a qué medio pertenece.
 */
export function porMedioAgrupado(
  porMedio: ResumenDeRecaudo['porMedio'],
): { medio: string; nombre: string; valorCop: number; cantidad: number }[] {
  const grupos = new Map<string, { medio: string; nombre: string; valorCop: number; cantidad: number }>();
  for (const m of porMedio) {
    const texto = (m.medio ?? '').trim();
    const tipo = texto ? normalizarMedio(texto) : 'SIN_MEDIO';
    const nombre = NOMBRE_DEL_MEDIO[tipo] || m.nombre?.trim() || texto;
    const grupo = grupos.get(tipo) ?? { medio: tipo, nombre, valorCop: 0, cantidad: 0 };
    grupo.valorCop += m.valorCop;
    grupo.cantidad += m.cantidad;
    grupos.set(tipo, grupo);
  }
  return [...grupos.values()].sort((a, b) => b.valorCop - a.valorCop || a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Qué es «Llegó», dicho con las CUOTAS (PG-09): los recibos con fecha en el
 * mes son de la cuota que sea; lo que ya entró a las cuotas de ESTE mes es otra
 * cifra (puede haber entrado antes), y se dice aparte. Sin el campo (un back
 * anterior), sólo la primera frase: nunca «cobros».
 */
export function definicionDeLoQueLlego(
  r: Pick<ResumenDeRecaudo, 'pagadoDeLasCuotasDelMesCop'>,
  month: string,
  locale: 'es' | 'en' = 'es',
): string {
  if (locale === 'en') {
    const base = 'Cash receipts dated in the month, for whatever installment.';
    return typeof r.pagadoDeLasCuotasDelMesCop === 'number'
      ? `${base} ${formatCurrency(r.pagadoDeLasCuotasDelMesCop)} has already come in for the ${nombreDelMes(month, 'en')} installments, this month or earlier.`
      : base;
  }
  const base = 'Recibos de caja con fecha en el mes, de la cuota que sea.';
  return typeof r.pagadoDeLasCuotasDelMesCop === 'number'
    ? `${base} A las cuotas de ${nombreDelMes(month)} ya entraron ${formatCurrency(r.pagadoDeLasCuotasDelMesCop)}, en este mes o antes.`
    : base;
}

/**
 * 🔴 PG-10: con qué se mide el %, dicho en la columna de al lado. La tasa
 * sobre lo CAUSADO divide lo pagado de las cuotas del mes entre «Se debe»;
 * la de lo EMITIDO, lo pagado de los cobros entre lo que reclaman. La columna
 * muestra el NUMERADOR de la misma tasa (`tasaDeRecaudo.numeradorCop`), así
 * el porcentaje y su cifra no pueden salir de bases distintas.
 */
export function rotuloDelNumerador(base: 'CAUSADO' | 'EMITIDO' | undefined): string {
  return base === 'EMITIDO' ? 'Pagado de los cobros emitidos' : 'Pagado de las cuotas del mes';
}

/** El numerador de la tasa de ese mes; con un back sin él, lo pagado de las cuotas si viene. */
export function numeradorDeLaTasa(p: Pick<PuntoDeLaSerie, 'tasaDeRecaudo' | 'pagadoDeLasCuotasDelMesCop'>): number | null {
  if (p.tasaDeRecaudo && Number.isFinite(p.tasaDeRecaudo.numeradorCop)) return p.tasaDeRecaudo.numeradorCop;
  if (p.tasaDeRecaudo?.base !== 'EMITIDO' && typeof p.pagadoDeLasCuotasDelMesCop === 'number') {
    return p.pagadoDeLasCuotasDelMesCop;
  }
  return null;
}

/**
 * «No hay nada que contar» sólo cuando de verdad no hubo nada en el mes.
 *
 * 🔴 `deudaDelMesCop` y `cuotasDelMes` entraron el 2026-09-16 y son lo que
 * evita el error caro: un mes con 30.951 cuotas y $1.251 millones de deuda
 * pero sin un solo cobro emitido cumplía las cuatro condiciones viejas y se
 * anunciaba como «nada que contar». Es el mes típico de la inmobiliaria
 * migrada.
 */
export function mesSinMovimiento(r: ResumenDeRecaudo): boolean {
  return (
    r.deudaDelMesCop === 0 &&
    r.cuotasDelMes === 0 &&
    r.facturadoCop === 0 &&
    r.recaudadoCop === 0 &&
    r.dispersadoCop === 0 &&
    r.cobrosPagados + r.cobrosPendientes + r.cobrosEnMora === 0
  );
}

/**
 * La tasa de recaudo del mes, en entero, como la midió el BACK.
 *
 * 🔴 Esta pantalla dividía `recaudadoCop` —la plata que entró por caja en el
 * mes, de cualquier período— entre `deudaDelMesCop`: una tercera definición
 * de «tasa de recaudo» que no cuadraba ni con el Resumen ni con Cobros
 * emitidos. Ahora es la de la inmobiliaria (sobre lo causado por defecto, o
 * sobre lo emitido), calculada en `dashboard/tasa-de-recaudo.ts` del back, y
 * la columna dice con qué fórmula.
 *
 * `null` cuando no hubo contra qué medir: un 0 % sobre $0 afirma que no se
 * recaudó, y no había nada que recaudar.
 */
export function porcentajeRecaudado(p: Pick<PuntoDeLaSerie, 'tasaDeRecaudo'>): number | null {
  const pct = p.tasaDeRecaudo?.pct;
  return pct === null || pct === undefined ? null : Math.round(pct);
}

/** Lo que dice la celda cuando no hubo contra qué medir, según la fórmula. */
export function sinTasaQueMedir(p: Pick<PuntoDeLaSerie, 'tasaDeRecaudo'>): string {
  return p.tasaDeRecaudo?.base === 'EMITIDO' ? 'Sin cobros' : 'Sin deuda';
}

/** La serie para la tabla: el mes más reciente arriba, que es el que se mira. */
export function serieParaLaTabla(serie: readonly PuntoDeLaSerie[]): PuntoDeLaSerie[] {
  return [...serie].sort((a, b) => b.month.localeCompare(a.month));
}

export function Recaudo() {
  const tr = useTr();
  const locale = useLocaleDelPanel();
  const en = locale === 'en';
  /** «cuota»/«installment» con su número gramatical. */
  const cuotas = (n: number) => (en ? (n === 1 ? 'installment' : 'installments') : plural(n, 'cuota', 'cuotas'));
  const [month, setMonth] = useState(() => mesActual());
  const { resumen, serie, cargando, error, recargar } = useRecaudo(month);
  const comparativaDelMes = useComparativaDelRecaudo(month);
  const { comparativa } = comparativaDelMes;
  const falloLaComparativa = Boolean(comparativaDelMes.error) && !comparativaDelMes.cargando;
  const sinComparacion = sinComparacionEnNinguna(comparativa);
  /** La línea «vs mes anterior» de una cifra. */
  const vs = (
    id: string,
    cifra: 'seDebe' | 'llego' | 'falta' | 'salio' | 'queda',
    sentido: SentidoDeLaCifra,
    valorMostrado: number,
  ) => (
    <VsMesAnterior
      id={id}
      comparativa={comparativa}
      cifra={cifra}
      sentido={sentido}
      fallo={falloLaComparativa}
      valorMostrado={valorMostrado}
      formato={plata}
      callarSinComparacion={sinComparacion}
    />
  );

  // 22-10 (revisión de Dinero): las definiciones, detrás de «Qué mide cada cifra».
  const [verDefiniciones, setVerDefiniciones] = useState(false);
  const siguiente = sumarMeses(month, 1);
  // Los mismos decimales en las cinco cifras (revisión 22-10).
  const plata = plataPareja([
    ...(resumen ? [resumen.deudaDelMesCop, resumen.recaudadoCop, resumen.pendienteCop, resumen.dispersadoCop, resumen.disponibleCop] : []),
    ...(serie ?? []).flatMap((p) => [p.deudaDelMesCop, p.recaudadoCop, p.dispersadoCop]),
    ...(resumen?.porMedio ?? []).map((m) => m.valorCop),
  ]);
  const puedeAvanzar = !esFuturo(siguiente);

  const puntos = useMemo(() => serieParaLaTabla(serie ?? []), [serie]);
  // Con qué fórmula se midió la columna: la del mes en foco, o la de la serie.
  const rotuloDeLaTasa =
    resumen?.tasaDeRecaudo?.rotulo ?? puntos[0]?.tasaDeRecaudo?.rotulo ?? 'Tasa de recaudo';
  const baseDeLaTasa = resumen?.tasaDeRecaudo?.base ?? puntos[0]?.tasaDeRecaudo?.base;
  const medios = useMemo(() => porMedioAgrupado(resumen?.porMedio ?? []), [resumen]);
  const totalDeRecibos = useMemo(
    () =>
      (resumen?.porMedio ?? []).reduce(
        (acc, m) => ({ cantidad: acc.cantidad + m.cantidad, valorCop: acc.valorCop + m.valorCop }),
        { cantidad: 0, valorCop: 0 },
      ),
    [resumen],
  );

  return (
    <div className="space-y-6">
      {/* ── El mes ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Ronda 12: el mismo selector de mes que el Tablero (píldora con flechas). */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-1 py-0.5" data-testid="selector-de-mes">
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            aria-label={tr("Mes anterior")}
            onClick={() => setMonth(sumarMeses(month, -1))}
          >
            <CaretLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <p className="min-w-[10.5rem] text-center text-sm font-medium text-fg" data-testid="mes-en-foco">
            {/* El mes nuevo entra con un fundido; las cifras de abajo cuentan
                desde las del mes anterior. */}
            <Appear as="span" key={month} direction="none">
            {conMayusculaInicial(nombreDelMes(month, locale))}
            </Appear>
          </p>
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            aria-label={tr("Mes siguiente")}
            disabled={!puedeAvanzar}
            onClick={() => puedeAvanzar && setMonth(siguiente)}
          >
            <CaretRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* 22-10: dos salidas (las demás viven en el riel de Pagos), sin flechas. */}
          {/* 🔴 Juan (15-10-2026): «¿dónde se ven los recibos de caja que se generaron?». */}
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/recibos">{tr("Ver los recibos")}</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/dispersiones/lotes">{tr("Lotes al banco")}</Link>
          </Button>
        </div>
      </div>

      {/* ── Cargando → falló → vacío → cifras, en ese orden ───────────────
          `cargando && !resumen` deja pasar el refresco de fondo (cambiar de
          mes) sin blanquear lo que ya se está viendo. */}
      <EstadoDeDatos
        cargando={cargando && !resumen}
        error={error}
        queEs={tr("el recaudo")}
        onReintentar={recargar}
        esqueleto={
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        }
      >
        {/* Un mes sin movimiento NO esconde la pantalla: las cifras van en cero
            y las tablas de la casa siguen ahí con su vacío adentro (Nico,
            2026-09-08: «recaudo no tiene el tipo de tablas que manejamos»). Lo
            único que cambia es una línea que lo dice. */}
        {!resumen ? null : (
          <>
            <Presence
              as="p"
              show={mesSinMovimiento(resumen)}
              initial={false}
                className="flex flex-wrap items-center gap-x-2 rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm text-fg-muted"
                data-testid="mes-sin-movimiento"
              >
                <span>
                  {tr("Nada que contar en")} {nombreDelMes(month, locale)}{tr(": ningún contrato tiene cuota de este mes, y no hubo cobros, recibos ni giros con fecha en él. Si la plata entró, se registra con un recibo de caja.")}
                </span>
                <Link href="/panel/inmobiliaria/pagos" className="font-medium text-primary underline-offset-2 hover:underline">
                  {tr("Ir a la deuda del mes")}
                </Link>
            </Presence>
            {/* GLOW UP (revisión de Dinero, 22-10-2026: «5 cifras con párrafos»): UNA
                cifra grande —lo que llegó contra lo que se debe, con su barra— y las
                demás compactas al lado; lo que mide cada una, plegado. */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              {sinComparacion && comparativa ? (
                <p className="text-caption text-fg-muted" data-testid="sin-comparacion-en-ninguna">
                  {en
                    ? `No comparison with ${soloElMes(comparativa.mesAnterior, 'en')}: that month had almost no activity.`
                    : `Sin comparación con ${soloElMes(comparativa.mesAnterior)}: ese mes casi no tuvo movimiento.`}
                </p>
              ) : (
                <span />
              )}
              <button
                type="button"
                aria-pressed={verDefiniciones}
                onClick={() => setVerDefiniciones((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full text-body-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="que-mide-el-recaudo"
              >
                {verDefiniciones ? tr('Ocultar qué mide cada cifra') : tr('Qué mide cada cifra')}
              </button>
            </div>
            <div
              className="-mt-3 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-2"
              data-testid="cifras"
            >
              {/* Ronda 11 (390): «Llegó» va primero en el orden de la página —es lo que se
                  lee primero en el celular—; en escritorio cada cifra tiene su lugar
                  fijo en la grilla (lg:col-start), así que allí nada cambia. */}
              <Cifra
                formato={plata}
                id="llego"
                destacada
                verDefinicion={verDefiniciones}
                className="sm:col-span-2 lg:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-1"
                etiqueta={tr("Llegó")}
                valor={resumen.recaudadoCop}
                extra={
                  resumen.deudaDelMesCop > 0 ? (
                    <div className="mt-1 space-y-1.5">
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={tr('Qué parte de lo que se debe ya llegó')}>
                        <span
                          className="h-full rounded-full bg-success-500"
                          style={{ width: `${Math.min(100, Math.max(0, ((resumen.deudaDelMesCop - resumen.pendienteCop) / resumen.deudaDelMesCop) * 100))}%` }}
                        />
                      </div>
                      <p className="text-body-sm text-fg-muted">
                        {tr('de')} <span className="font-mono tabular-nums text-fg">{plata(resumen.deudaDelMesCop)}</span>{' '}
                        {tr('que se deben en')} {nombreDelMes(month, locale)}
                      </p>
                      {/* 22-10 (revisión: «la cuenta no cierra»): lo que llegó incluye pagos de
                          otros meses; se dice qué parte es de las cuotas del mes. */}
                      {resumen.pagadoDeLasCuotasDelMesCop != null && resumen.recaudadoCop - resumen.pagadoDeLasCuotasDelMesCop > 0 ? (
                        <p className="text-caption text-fg-muted" data-testid="llego-de-otros-meses">
                          <span className="font-mono tabular-nums text-fg">{plata(resumen.pagadoDeLasCuotasDelMesCop)}</span>{' '}
                          {tr('son de las cuotas del mes y')}{' '}
                          <span className="font-mono tabular-nums text-fg">{plata(resumen.recaudadoCop - resumen.pagadoDeLasCuotasDelMesCop)}</span>{' '}
                          {tr('de meses anteriores.')}
                        </p>
                      ) : null}
                    </div>
                  ) : null
                }
                comparacion={vs('llego', 'llego', 'subirEsBueno', resumen.recaudadoCop)}
                /* 🔴 PG-09 (03-10-2026): hablaba de «cobros de este mes»
                   (`recaudadoDelMesCop` sale de `Cobro.month`), y la deuda vive
                   en las CUOTAS. Ahora dice lo pagado de las cuotas del mes
                   (`pagadoDeLasCuotasDelMesCop`, entrara cuando entrara); con un
                   back sin ese campo, sólo qué son los recibos. */
                definicion={definicionDeLoQueLlego(resumen, month, locale)}
              />
              {/* 🔴 Primero lo que el mes HACE DEBER. Es la cifra de la que
                  cuelgan las demás, y la que existe desde que se firma cada
                  contrato: no hay que emitir nada para que haya deuda. */}
              <Cifra
                formato={plata}
                id="se-debe"
                verDefinicion={verDefiniciones}
                className="lg:col-start-2 lg:row-start-1"
                etiqueta={tr("Se debe")}
                valor={resumen.deudaDelMesCop}
                comparacion={vs('se-debe', 'seDebe', 'neutro', resumen.deudaDelMesCop)}
                definicion={
                  en
                    ? `What was agreed in the ${numero(resumen.cuotasDelMes)} ${cuotas(resumen.cuotasDelMes)} for ${nombreDelMes(month, 'en')}, paid or not. It's born with the lease; no one has to generate it.`
                    : `Lo pactado en las ${numero(resumen.cuotasDelMes)} ${plural(resumen.cuotasDelMes, 'cuota', 'cuotas')} de ${nombreDelMes(month)}, pagadas o no. Nace con el contrato; nadie tiene que generarlo.`
                }
              />
              <Cifra
                formato={plata}
                id="pendiente"
                verDefinicion={verDefiniciones}
                className="lg:col-start-3 lg:row-start-1"
                etiqueta={tr("Pendiente")}
                valor={resumen.pendienteCop}
                tono={resumen.pendienteCop > 0 ? 'warning' : undefined}
                comparacion={vs('pendiente', 'falta', 'subirEsMalo', resumen.pendienteCop)}
                /* 🔴 CUOTAS, no cobros. Con 0 cobros emitidos esta línea decía
                   «Saldo de los 0 cobros del mes sin pagar» encima de $1.251
                   millones. Y la cartera se cuenta aparte porque no es lo
                   mismo: lo vencido dentro del plazo del contrato es deuda,
                   no cartera. */
                definicion={
                  en
                    ? `Balance of ${numero(resumen.cuotasPendientes)} ${cuotas(resumen.cuotasPendientes)} for ${nombreDelMes(month, 'en')} not fully paid. Accumulated receivables, including earlier months: ${formatCurrency(resumen.enMoraCop)} in ${numero(resumen.cuotasEnCartera)} ${cuotas(resumen.cuotasEnCartera)}.`
                    : `Saldo de ${numero(resumen.cuotasPendientes)} ${plural(resumen.cuotasPendientes, 'cuota', 'cuotas')} de ${nombreDelMes(month)} sin pagar del todo. En cartera acumulada, con meses anteriores: ${formatCurrency(resumen.enMoraCop)} en ${numero(resumen.cuotasEnCartera)} ${plural(resumen.cuotasEnCartera, 'cuota', 'cuotas')}.`
                }
              />
              <Cifra
                formato={plata}
                id="dispersado"
                verDefinicion={verDefiniciones}
                className="lg:col-start-2 lg:row-start-2"
                etiqueta={tr("Girado")}
                valor={resumen.dispersadoCop}
                comparacion={vs('dispersado', 'salio', 'neutro', resumen.dispersadoCop)}
                definicion={
                  en
                    ? `Paid batches and one-off payouts dated in the month. The agency kept ${formatCurrency(resumen.comisionesCop)} in commission.`
                    : `Lotes pagados y giros uno a uno con fecha en el mes. La inmobiliaria se quedó ${formatCurrency(resumen.comisionesCop)} de comisión.`
                }
              />
              <Cifra
                formato={plata}
                id="disponible"
                verDefinicion={verDefiniciones}
                className="lg:col-start-3 lg:row-start-2"
                etiqueta={tr("Disponible")}
                valor={resumen.disponibleCop}
                tono={resumen.disponibleCop < 0 ? 'danger' : undefined}
                comparacion={vs('disponible', 'queda', 'neutro', resumen.disponibleCop)}
                definicion={tr(
                  resumen.disponibleCop < 0
                    ? 'Recaudado menos dispersado y comisiones, acumulado al cierre del mes. Negativo: se giró plata que nunca pasó por un recibo de caja.'
                    : 'Recaudado menos dispersado y comisiones, acumulado al cierre del mes: lo que hay en la mano y es de terceros.',
                )}
              />
            </div>

            {/* 🔴 PG-09 (QA de Pagos, 03-10-2026): acá iba «Cobros emitidos
                $89.250.000 en 29 documentos · 0 en mora» al lado de «Se debe
                $92.230.850 en 30 cuotas» y de una Deuda del mes con 25 cuotas
                en cartera: dos verdades. La deuda nace con las CUOTAS del
                contrato y el cobro es un documento que puede no existir
                («Cobros sobra», CEO 15-09). La línea habla ahora de las mismas
                cuotas que las cinco cifras; los cobros emitidos se ven en
                Cartera › Cobros emitidos («Ver cobros del mes», arriba).

                Va PEGADO a las cinco cifras, no flotando entre ellas y el
                gráfico: suelto en medio de la página era uno más de los bloques
                que Nico no podía asociar a nada (21-09). */}
            <p
              className="-mt-2 border-l-2 border-border pl-3 text-xs text-fg-muted"
              data-testid="cuotas-del-mes"
            >
              {resumen.cuotasDelMes === 0 ? (
                <>{tr("Ningún contrato tiene cuota de")} {nombreDelMes(month, locale)}.</>
              ) : en ? (
                <>
                  Of the <span className="font-mono tabular-nums">{numero(resumen.cuotasDelMes)}</span>{' '}
                  {cuotas(resumen.cuotasDelMes)} for {nombreDelMes(month, 'en')},{' '}
                  <span className="font-mono tabular-nums">{numero(resumen.cuotasPagadas)}</span>{' '}
                  {resumen.cuotasPagadas === 1 ? 'is paid' : 'are paid'} and{' '}
                  <span className="font-mono tabular-nums">{numero(resumen.cuotasPendientes)}</span>{' '}
                  {resumen.cuotasPendientes === 1 ? 'is not fully paid' : 'are not fully paid'}.
                </>
              ) : (
                <>
                  {tr("De las")}{' '}
                  <span className="font-mono tabular-nums">{numero(resumen.cuotasDelMes)}</span>{' '}
                  {plural(resumen.cuotasDelMes, 'cuota', 'cuotas')} {tr("de")} {nombreDelMes(month)},{' '}
                  <span className="font-mono tabular-nums">{numero(resumen.cuotasPagadas)}</span>{' '}
                  {plural(resumen.cuotasPagadas, 'está pagada', 'están pagadas')} y{' '}
                  <span className="font-mono tabular-nums">{numero(resumen.cuotasPendientes)}</span>{' '}
                  {plural(resumen.cuotasPendientes, 'está sin pagar del todo', 'están sin pagar del todo')}.
                </>
              )}
            </p>

            {/* 🔴 Este mes contra el anterior (Nico, 25-09): el día a día y la
                proyección del cierre. Va pegado a las cifras porque las explica;
                su propio estado de carga/fallo no toca el resto. */}
            <ComparativaDelMes
              month={month}
              comparativa={comparativa}
              cargando={comparativaDelMes.cargando}
              error={comparativaDelMes.error}
              onReintentar={() => comparativaDelMes.recargar()}
              formato={plata}
            />

            {/* El gráfico sí lleva su nombre: es un gráfico, no una tabla. */}
            <section
              className="space-y-4 rounded-lg border border-border bg-surface p-6"
              aria-labelledby="ultimos-doce-meses"
            >
              <div className="space-y-1">
                <h2 id="ultimos-doce-meses" className="text-sm font-semibold text-fg">
                  {tr("Últimos doce meses")}
                </h2>
                <p className="text-xs text-fg-muted">
                  {tr("Lo que se pidió, lo que llegó y lo que salió, mes por mes hasta")} {nombreDelMes(month, locale)}.
                </p>
              </div>
              {puntos.length > 0 ? (
                <GraficoDeRecaudo serie={serie ?? []} />
              ) : (
                <p className="text-body-sm text-fg-muted">{tr("Todavía no hay serie para graficar.")}</p>
              )}
            </section>

            {/* Los mismos doce meses, en la tabla de la casa. La fila del mes
                en foco va marcada y cualquier fila cambia el mes: es el
                selector de arriba, pero con los números a la vista. */}
            {/* 22-10 (revisión de Dinero): la tabla de doce meses repetía el gráfico;
                queda plegada debajo, montada (la fila cambia el mes, como siempre). */}
            <MasDetalles etiqueta={tr('Ver mes por mes, en números')} etiquetaAbierto={tr('Ocultar mes por mes')} montadoSiempre>
            <section
              className="overflow-hidden rounded-lg border border-border bg-surface"
              aria-labelledby="serie-mensual-titulo"
            >
              {/* 🔴 CADA BLOQUE DICE QUÉ ES (Nico, 21-09: «pasa lo mismo con
                  esta de recaudo… es un vómito literal», «todo en esta pantalla
                  está como suelto, nada realmente se sabe que es de qué»).
                  «No nombramos las tablas» vale cuando la tarjeta que las
                  contiene ya lo dice —en «Deuda del mes» lo dicen el mes, las
                  pestañas y el buscador—; acá la tabla ERA la tarjeta entera y
                  no había nada que la nombrara. El gráfico de arriba ya llevaba
                  su nombre, y era el único de los cuatro bloques. */}
              <div className="space-y-1 border-b border-border px-6 py-4">
                <h2 id="serie-mensual-titulo" className="text-sm font-semibold text-fg">
                  {tr("Mes por mes, en números")}
                </h2>
                <p className="text-xs text-fg-muted">
                  {tr("Lo mismo que el gráfico de arriba, con las cifras exactas. La fila del mes elegido va resaltada.")}
                </p>
              </div>
              <Table data-testid="serie-mensual">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{tr("Mes")}</TableHead>
                    {/* La columna era «Facturado» (cobros emitidos) y quedaba
                        en $0 en toda la serie de la inmobiliaria migrada. */}
                    <TableHead className="whitespace-nowrap text-right">{tr("Se debe")}</TableHead>
                    {/* 🔴 PG-10 (QA de Pagos, 03-10-2026): «Recaudado $22.573.888 ·
                        Recaudo sobre lo causado 13 %» en octubre (22,57 ÷ 92,23 es
                        24 %): la columna era la plata con FECHA en el mes y el %
                        salía de lo pagado de las CUOTAS del mes, sin decirlo.
                        Ahora el numerador del % va al lado del %, con su nombre,
                        y lo recaudado en el mes dice qué base usa. */}
                    <TableHead className="text-right" data-testid="rotulo-del-numerador">
                      {tr(rotuloDelNumerador(baseDeLaTasa))}
                    </TableHead>
                    {/* 🔴 El nombre de la fórmula, no «% recaudado»: «Recaudo sobre lo
                        causado» y «Pagado de lo emitido» son dos números distintos. */}
                    <TableHead className="text-right" data-testid="rotulo-de-la-tasa">
                      {tr(rotuloDeLaTasa)}
                    </TableHead>
                    <TableHead className="text-right" data-testid="rotulo-de-lo-recaudado">
                      {tr("Recaudado en el mes")}
                      <span className="block font-sans text-caption normal-case tracking-normal text-fg-subtle">
                        {tr("recibos con fecha del mes")}
                      </span>
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">{tr("Girado")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {puntos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <SinDatos
                          queSon={tr("meses con movimiento")}
                          icono={Coins}
                          titulo={tr("Todavía no hay serie")}
                          descripcion={tr("Cuando haya cobros, recibos o giros en algún mes, aparece acá.")}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    puntos.map((p) => {
                      const enFoco = p.month === month;
                      const pct = porcentajeRecaudado(p);
                      const numerador = numeradorDeLaTasa(p);
                      return (
                        <TableRow
                          key={p.month}
                          onClick={() => setMonth(p.month)}
                          aria-current={enFoco ? 'true' : undefined}
                          className={cn('cursor-pointer', enFoco && 'bg-surface-muted')}
                          data-testid="serie-fila"
                          data-mes={p.month}
                        >
                          <TableCell className={cn('whitespace-nowrap', enFoco ? 'font-medium text-fg' : 'text-fg')}>
                            {conMayusculaInicial(nombreDelMes(p.month, locale))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {plata(p.deudaDelMesCop)}
                          </TableCell>
                          <TableCell
                            className="whitespace-nowrap text-right font-mono tabular-nums text-fg"
                            data-testid="serie-numerador"
                          >
                            {numerador === null ? '—' : plata(numerador)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {/* Sin contra qué medir no hay porcentaje: un «0 %» diría que no se recaudó. */}
                            {pct === null ? tr(sinTasaQueMedir(p)) : `${pct} %`}
                          </TableCell>
                          <TableCell
                            className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted"
                            data-testid="serie-recaudado"
                          >
                            {plata(p.recaudadoCop)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {plata(p.dispersadoCop)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </section>
            </MasDetalles>

            {/* Los recibos del mes, agrupados por medio de pago (así los manda
                el back). El pie suma: es la misma cifra que «Llegó». */}
            <section
              className="overflow-hidden rounded-lg border border-border bg-surface"
              aria-labelledby="por-medio-titulo"
            >
              <div className="space-y-1 border-b border-border px-6 py-4">
                <h2 id="por-medio-titulo" className="text-sm font-semibold text-fg">
                  {tr("Cómo entró la plata de")} {nombreDelMes(month, locale)}
                </h2>
                <p className="text-xs text-fg-muted">
                  {tr("Los recibos de caja del mes, por medio de pago. El total es la misma cifra que «Llegó» arriba.")}
                </p>
              </div>
              <Table data-testid="por-medio">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{tr("Medio de pago")}</TableHead>
                    {/* Ronda 11 (390): bajo 768 son dos columnas —«Transferencia · 7 recibos» y
                        el valor—; la tabla ya no se desplaza de lado ni corta el Valor. */}
                    <TableHead className="whitespace-nowrap text-right max-md:hidden">{tr("Recibos")}</TableHead>
                    <TableHead className="whitespace-nowrap text-right">{tr("Valor")}</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Cada mes es un cuerpo nuevo: sus medios de pago entran
                    escalonados. */}
                <TableBodyAnimado key={month}>
                  {medios.length === 0 ? (
                    <TableRowAnimada key="vacio">
                      <TableCell colSpan={3} className="p-0" data-testid="sin-recibos">
                        <SinDatos
                          queSon={tr("recibos de caja")}
                          icono={Receipt}
                          titulo={tr("Ningún recibo de caja en el mes")}
                          descripcion={
                            en
                              ? `Receipts dated in ${nombreDelMes(month, 'en')} show up here, grouped by how the money came in.`
                              : `Los recibos con fecha en ${nombreDelMes(month)} aparecen acá, agrupados por cómo entró la plata.`
                          }
                        />
                      </TableCell>
                    </TableRowAnimada>
                  ) : (
                    medios.map((m) => (
                      <TableRowAnimada key={m.medio} data-testid="medio-fila">
                        <TableCell className="text-fg">
                          {tr(m.nombre || nombreDelMedio(m.medio))}
                          <span className="whitespace-nowrap text-caption text-fg-muted md:hidden">
                            {' · '}
                            {en
                              ? `${m.cantidad} ${m.cantidad === 1 ? 'receipt' : 'receipts'}`
                              : `${m.cantidad} ${m.cantidad === 1 ? 'recibo' : 'recibos'}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-fg-muted max-md:hidden">{m.cantidad}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-fg">
                          {plata(m.valorCop)}
                        </TableCell>
                      </TableRowAnimada>
                    ))
                  )}
                </TableBodyAnimado>
                {medios.length > 0 && (
                  <TableFooter>
                    <TableRow data-testid="medio-total">
                      <TableCell className="font-medium text-fg">
                        {tr("Total")}
                        <span className="text-caption font-normal text-fg-muted md:hidden">
                          {' · '}
                          {en
                            ? `${totalDeRecibos.cantidad} ${totalDeRecibos.cantidad === 1 ? 'receipt' : 'receipts'}`
                            : `${totalDeRecibos.cantidad} ${totalDeRecibos.cantidad === 1 ? 'recibo' : 'recibos'}`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-fg-muted max-md:hidden">
                        {totalDeRecibos.cantidad}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums text-fg">
                        <AnimatedNumber value={totalDeRecibos.valorCop} format={plata} />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </section>
          </>
        )}
      </EstadoDeDatos>
    </div>
  );
}

function Cifra({
  id,
  etiqueta,
  valor,
  definicion,
  tono,
  comparacion,
  destacada = false,
  verDefinicion = false,
  extra,
  className,
  formato = formatCurrency,
}: {
  id: string;
  etiqueta: string;
  valor: number;
  definicion: string;
  tono?: 'warning' | 'danger';
  /** La línea «vs mes anterior», a la misma fecha. */
  comparacion?: ReactNode;
  /** La cifra que decide la pantalla: grande (22-10). */
  destacada?: boolean;
  /** «Qué mide cada cifra» abierto: la definición se ve. Plegada sigue montada. */
  verDefinicion?: boolean;
  extra?: ReactNode;
  className?: string;
  formato?: (n: number) => string;
}) {
  return (
    <section
      className={cn('flex min-w-0 flex-col gap-1.5 bg-surface px-5 py-4', destacada && 'gap-2 py-5 sm:px-6', className)}
      data-testid={`cifra-${id}`}
    >
      <p className={cn(destacada ? 'font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle' : 'text-caption text-fg-muted')}>
        {etiqueta}
      </p>
      <p
        className={cn(
          'font-mono tabular-nums text-fg',
          destacada ? 'text-[32px] font-medium leading-none tracking-[-0.02em] sm:text-[40px]' : 'text-[19px]',
          tono === 'warning' && 'text-warning',
          tono === 'danger' && 'text-danger',
        )}
        data-testid={`valor-${id}`}
      >
        {/* Cuenta desde la del mes anterior al cambiar de mes. */}
        <AnimatedNumber value={valor} format={formato} />
      </p>
      {extra}
      {comparacion}
      <p hidden={!verDefinicion} className={cn('text-caption leading-relaxed text-fg-muted', verDefinicion && 'animate-rise-in')}>
        {definicion}
      </p>
    </section>
  );
}
