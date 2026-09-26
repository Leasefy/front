'use client';

/**
 * El mes contra el anterior y hacia dónde va a cerrar — lo que Palomma
 * mostraba y Recaudo no (Nico, 2026-09-25).
 *
 * Tres piezas, todas con los números del back
 * (`GET /inmobiliaria/recaudo/comparativa`, definiciones en
 * `recaudo/comparativa-del-mes.ts`); esta pantalla las repite, no las
 * recalcula:
 *
 *   1. `VsMesAnterior`: el «% vs mes anterior» debajo de cada cifra, A LA
 *      MISMA FECHA (día N contra día N). Flecha + signo + palabras + color del
 *      DS: el color nunca va solo.
 *   2. `GraficoDiaADia`: lo que llegó, acumulado por día, en dos líneas.
 *   3. La proyección del cierre, con la cuenta escrita en una línea.
 *
 * ── 🔴 Lo que esta pantalla se niega a decir ─────────────────────────────────
 *
 *   - «0 %» o «∞ %» cuando el mes anterior dio 0 o no hay dato: dice «sin
 *     comparación con agosto». `pct: null` del back es exactamente eso.
 *   - «$ 0» de una proyección que no se pudo hacer: sin historia dice «Sin
 *     datos» y por qué. `formatCurrency(null)` pinta «$ 0», así que nunca se le
 *     pasa un `null`.
 *   - Un número de otro mes mientras llega el nuevo: el hook devuelve `null`
 *     si la comparativa no es del mes elegido.
 *   - Tumbar la pantalla si esta lectura falla: las cinco cifras vienen de
 *     otra, y lo único que dice «no se pudo leer» es la comparación.
 */

import { ArrowDown, ArrowUp, Equals } from '@phosphor-icons/react';

import { Spinner } from '@/components/ui/spinner';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import type {
  ComparativaDelMes as Comparativa,
  ProyeccionDelCierre,
  VariacionDeLaCifra,
} from '@/lib/api/recaudo.types';
import { formatCurrency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { nombreDelMes } from '@/lib/recaudo/meses';
import { cn } from '@/lib/utils';
import { GraficoDiaADia } from './GraficoDiaADia';

const C = 'inmobiliaria.recaudo.comparativa';

/** «agosto», sin el año: para «10 de agosto» y «sin comparación con agosto». */
export function soloElMes(month: string): string {
  return nombreDelMes(month).replace(/ de \d{4}$/, '');
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const formateadorDePct = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/** «+12,3 %», «−27,8 %», «0 %». El signo va escrito: el color no va solo. */
export function formatearPct(pct: number): string {
  const signo = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${signo}${formateadorDePct.format(Math.abs(pct))} %`;
}

/** Una tasa entre 0 y 1 como porcentaje entero: «70 %». */
function tasaEnPct(tasa: number): string {
  return `${Math.round(tasa * 100)} %`;
}

/** «junio, julio y agosto». */
function listaDeMeses(meses: string[]): string {
  const nombres = meses.map(soloElMes);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Qué quiere decir que una cifra suba. «Llegó» que sube es bueno; «falta» que
 * sube es malo; «se debe», «salió» y «queda en la mano» dependen de cosas que
 * la cifra sola no cuenta, y van en el tono neutro.
 */
export type SentidoDeLaCifra = 'subirEsBueno' | 'subirEsMalo' | 'neutro';

export function tonoDeLaVariacion(
  pct: number,
  sentido: SentidoDeLaCifra,
): 'success' | 'danger' | 'muted' {
  if (pct === 0 || sentido === 'neutro') return 'muted';
  const sube = pct > 0;
  return sube === (sentido === 'subirEsBueno') ? 'success' : 'danger';
}

/**
 * La línea «+12,3 % vs. el 10 de agosto» debajo de una cifra.
 *
 * `comparativa === null` y sin error = todavía cargando: no se pinta nada (una
 * cifra sin su línea un instante es mejor que un «sin comparación» falso).
 */
export function VsMesAnterior({
  id,
  comparativa,
  cifra,
  sentido,
  fallo,
  valorMostrado,
}: {
  id: string;
  comparativa: Comparativa | null;
  cifra: keyof Comparativa['vsMesAnterior'];
  sentido: SentidoDeLaCifra;
  fallo: boolean;
  /** La cifra grande de la tarjeta; si el corte da otra, se dice cuál. */
  valorMostrado: number;
}) {
  const { t } = useI18n();
  if (!comparativa) {
    if (!fallo) return null;
    return (
      <p className="text-caption text-fg-muted" data-testid={`vs-${id}`} data-estado="error">
        {t(`${C}.vs.noSePudoLeer`)}
      </p>
    );
  }

  const v: VariacionDeLaCifra = comparativa.vsMesAnterior[cifra];
  const mesAnterior = soloElMes(comparativa.mesAnterior);
  if (v.pct === null) {
    return (
      <p className="text-caption text-fg-muted" data-testid={`vs-${id}`} data-estado="sin-comparacion">
        {t(`${C}.vs.sinComparacion`, { mes: mesAnterior })}
      </p>
    );
  }

  const fecha = t(`${C}.fecha`, { dia: comparativa.diaDelMesAnterior, mes: mesAnterior });
  const tono = tonoDeLaVariacion(v.pct, sentido);
  const Icono = v.pct > 0 ? ArrowUp : v.pct < 0 ? ArrowDown : Equals;
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-1 text-caption',
        tono === 'success' && 'text-success',
        tono === 'danger' && 'text-danger',
        tono === 'muted' && 'text-fg-muted',
      )}
      data-testid={`vs-${id}`}
      data-estado="con-comparacion"
      data-tono={tono}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" weight="bold" aria-hidden="true" />
      {v.pct === 0 ? (
        <span>{t(`${C}.vs.igual`, { fecha })}</span>
      ) : (
        <span>
          <span className="sr-only">{t(v.pct > 0 ? `${C}.vs.subio` : `${C}.vs.bajo`)} </span>
          <span className="font-mono tabular-nums">
            {t(`${C}.vs.cambio`, { pct: formatearPct(v.pct), fecha })}
          </span>
        </span>
      )}
      {v.actualCop !== valorMostrado && (
        <span className="text-fg-muted">
          · {t(`${C}.vs.aEsaFecha`, { dia: comparativa.dia, valor: formatCurrency(v.actualCop) })}
        </span>
      )}
    </p>
  );
}

/** La tarjeta de la proyección. Cada estado dice lo suyo; ninguno inventa. */
export function TarjetaDeProyeccion({
  proyeccion: p,
  month,
}: {
  proyeccion: ProyeccionDelCierre;
  month: string;
}) {
  const { t } = useI18n();
  const cerrado = p.estado === 'MES_CERRADO';
  const cifra = p.cierreCop === null ? null : formatCurrency(p.cierreCop);

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-6"
      aria-labelledby="proyeccion-titulo"
      data-testid="proyeccion"
      data-estado={p.estado}
    >
      <h2 id="proyeccion-titulo" className="text-sm font-semibold text-fg">
        {t(cerrado ? `${C}.proyeccion.tituloCerrado` : `${C}.proyeccion.titulo`)}
      </h2>
      <p
        className={cn(
          'text-2xl font-medium text-fg',
          cifra === null ? 'text-fg-muted' : 'font-mono tabular-nums',
        )}
        data-testid="proyeccion-cifra"
      >
        {cifra ?? t(`${C}.proyeccion.sinDatos`)}
      </p>

      {p.estado === 'PROYECTADA' && p.tasa !== null && (
        <>
          {p.rango && (
            <p className="text-body-sm text-fg" data-testid="proyeccion-rango">
              {t(`${C}.proyeccion.rango`, {
                min: formatCurrency(p.rango.minCop),
                max: formatCurrency(p.rango.maxCop),
                peor: tasaEnPct(Math.min(...p.historia.map((h) => h.tasa))),
                mejor: tasaEnPct(Math.max(...p.historia.map((h) => h.tasa))),
              })}
            </p>
          )}
          <p className="text-caption leading-relaxed text-fg-muted" data-testid="proyeccion-formula">
            {t(`${C}.proyeccion.formula`, {
              llego: formatCurrency(p.llegoCop),
              porVencer: formatCurrency(p.porVencerCop),
              tasa: tasaEnPct(p.tasa),
              meses: listaDeMeses(p.historia.map((h) => h.month)),
              cierre: formatCurrency(p.cierreCop ?? 0),
            })}
          </p>
          {p.historia.length < p.mesesPedidos && (
            <p className="text-caption text-warning" data-testid="proyeccion-historia-corta">
              {t(`${C}.proyeccion.historiaCorta`, {
                n: p.historia.length,
                pedidos: p.mesesPedidos,
              })}
            </p>
          )}
        </>
      )}

      {p.estado === 'SIN_HISTORIA' && (
        <>
          <p className="text-caption leading-relaxed text-fg-muted" data-testid="proyeccion-sin-historia">
            {t(`${C}.proyeccion.sinHistoria`, { pedidos: p.mesesPedidos })}
          </p>
          <p className="text-caption text-fg-muted">
            {t(`${C}.proyeccion.sinHistoriaCifras`, {
              llego: formatCurrency(p.llegoCop),
              porVencer: formatCurrency(p.porVencerCop),
            })}
          </p>
        </>
      )}

      {cerrado && (
        <p className="text-caption text-fg-muted">
          {t(`${C}.proyeccion.cerrado`, { mes: conMayuscula(soloElMes(month)) })}
        </p>
      )}
    </section>
  );
}

/**
 * El bloque entero: el gráfico día a día y la proyección, lado a lado en
 * pantalla ancha y uno debajo del otro en el teléfono.
 */
export function ComparativaDelMes({
  month,
  comparativa,
  cargando,
  error,
  onReintentar,
}: {
  month: string;
  comparativa: Comparativa | null;
  cargando: boolean;
  error: unknown;
  onReintentar: () => void;
}) {
  const { t } = useI18n();
  const mes = soloElMes(month);

  return (
    <EstadoDeDatos
      cargando={cargando && !comparativa}
      error={comparativa ? null : error}
      queEs={t(`${C}.queEs`)}
      onReintentar={onReintentar}
      esqueleto={
        <div className="flex items-center justify-center py-12" data-testid="comparativa-cargando">
          <Spinner />
        </div>
      }
    >
      {comparativa && (
        <div className="grid gap-4 lg:grid-cols-3" data-testid="comparativa">
          <CuerpoDelGrafico comparativa={comparativa} mes={mes} />
          <TarjetaDeProyeccion proyeccion={comparativa.proyeccion} month={month} />
        </div>
      )}
    </EstadoDeDatos>
  );
}

function CuerpoDelGrafico({ comparativa: c, mes }: { comparativa: Comparativa; mes: string }) {
  const { t } = useI18n();
  const mesAnterior = soloElMes(c.mesAnterior);
  const hayRecibos = c.dias.some((d) => (d.esteMesCop ?? 0) > 0 || (d.mesAnteriorCop ?? 0) > 0);
  const llego = c.vsMesAnterior.llego;
  const resumen = t(`${C}.diaADia.resumen`, {
    dia: c.dia,
    mes,
    actual: formatCurrency(llego.actualCop),
    diaAnterior: c.diaDelMesAnterior,
    mesAnterior,
    anterior: formatCurrency(llego.anteriorCop ?? 0),
  });

  return (
    <section
      className="min-w-0 space-y-4 rounded-lg border border-border bg-surface p-5 sm:p-6 lg:col-span-2"
      aria-labelledby="dia-a-dia-titulo"
    >
      <div className="space-y-1">
        <h2 id="dia-a-dia-titulo" className="text-sm font-semibold text-fg">
          {t(`${C}.diaADia.titulo`, { mes: conMayuscula(mes), mesAnterior })}
        </h2>
        <p className="text-caption text-fg-muted">
          {c.enCurso
            ? t(`${C}.diaADia.descripcionEnCurso`, {
                mes,
                mesAnterior: conMayuscula(mesAnterior),
                dia: c.dia,
              })
            : t(`${C}.diaADia.descripcionCerrado`)}
        </p>
      </div>
      {hayRecibos ? (
        <>
          <GraficoDiaADia
            dias={c.dias}
            nombreEsteMes={conMayuscula(mes)}
            nombreMesAnterior={conMayuscula(mesAnterior)}
            resumen={resumen}
            rotuloDelDia={(dia) => t(`${C}.diaADia.dia`, { dia })}
          />
          <p className="font-mono text-caption tabular-nums text-fg-muted" data-testid="dia-a-dia-resumen">
            {resumen}
          </p>
        </>
      ) : (
        <p className="text-body-sm text-fg-muted" data-testid="dia-a-dia-vacio">
          {t(`${C}.diaADia.sinRecibos`, { mes, mesAnterior })}
        </p>
      )}
    </section>
  );
}
