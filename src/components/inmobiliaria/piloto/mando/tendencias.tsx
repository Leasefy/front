'use client'

/**
 * Las TENDENCIAS del centro de mando (MANDO-DATOS, 05-10-2026): lo que
 * PILOTO-MANDO dejó como «necesita back», ya con datos reales.
 *
 *   · `SerieDeLoRecuperado` — lo recuperado día por día en 30 días, debajo de
 *     «Recuperado este mes» del núcleo (la misma definición, por día);
 *   · `TarjetaDelNegocio` — el recaudo del mes (lo mide el back, con la base
 *     que eligió la inmobiliaria), la mora de más de 30 días y su tendencia, y
 *     las horas ahorradas (medidas + estimadas, con su supuesto escrito);
 *   · `RitmoDeLosAgentes` — lo que hicieron SOLOS, por día y por agente, en
 *     14 días (las mismas entradas de la Actividad).
 *
 * Cada número aparece una vez y cada pieza dice «sin dato» si no llegó.
 * Colores de las series: cobalto, cian, ámbar y violeta (los tonos de apoyo
 * de DESIGN.md, sólo para gráficas), validados con el validador de paletas en
 * claro (#fff) y en oscuro (#0a0a0a); el quinto, «Otros», es el gris del
 * borde. Nunca los de estado (verde, amarillo, rojo).
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Minus, TrendDown, TrendUp } from '@phosphor-icons/react'
import { MonoLabel, Sparkline, motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { claveDelRotulo, fraseDeLasCifras } from '@/lib/tasa-de-recaudo'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

import { horasEnPalabras, type BarraDeAcciones } from './calculos'
import type { IndicadoresDelMando } from './indicadores'
import { Cifra, EnPieza, Medidor, pesos, TONO, unir, useNombreDeAgente, type Tono } from './piezas'
import { TEXTOS } from './textos'
import type { DatosDelMando } from './tipos'

const T = TEXTOS.tendencias

/** «5 oct.» de un día `AAAA-MM-DD` (es un día de calendario: se lee a mediodía UTC). */
function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** «5» para el eje de las barras (la fecha entera va en la leyenda de abajo y en la descripción). */
function diaCorto(fecha: string): string {
  return String(Number(fecha.slice(8, 10)))
}

// ── Lo recuperado, día por día ─────────────────────────────────────────────

export function SerieDeLoRecuperado({
  dias,
  tono = 'tinta',
  className,
}: {
  dias: ReadonlyArray<{ fecha: string; cop: number }>
  tono?: Tono
  className?: string
}) {
  const reducido = usePrefersReducedMotion()
  const [activo, setActivo] = useState<number | null>(null)
  if (dias.length === 0) return null
  const max = Math.max(...dias.map((d) => d.cop))
  const total = dias.reduce((s, d) => s + d.cop, 0)
  const mejor = dias.reduce((m, d) => (d.cop > m.cop ? d : m), dias[0] as { fecha: string; cop: number })
  const t = TONO[tono]
  const resumen =
    max > 0
      ? `${T.recuperadoSerie(dias.length)}: ${pesos(total)} en total; el mejor día, ${fechaCorta(mejor.fecha)}, ${pesos(mejor.cop)}.`
      : `${T.recuperadoSerie(dias.length)}: ningún pago recuperado.`
  const enFoco = activo !== null ? dias[activo] : null
  return (
    <figure className={cn('m-0 w-full max-w-[320px] space-y-1.5', className)}>
      <div
        role="img"
        aria-label={resumen}
        className="flex h-9 items-end gap-[2px]"
        onMouseLeave={() => setActivo(null)}
      >
        {dias.map((d, i) => {
          const alto = max > 0 ? Math.max(d.cop > 0 ? 0.12 : 0.04, d.cop / max) : 0.04
          return (
            <span
              key={d.fecha}
              className="relative flex h-full flex-1 items-end"
              onMouseEnter={() => setActivo(i)}
            >
              <motion.span
                aria-hidden="true"
                className={cn(
                  'block w-full origin-bottom rounded-t-[2px]',
                  d.cop > 0 ? (tono === 'tinta' ? 'bg-ink-fg' : 'bg-primary') : tono === 'tinta' ? 'bg-ink-border' : 'bg-border',
                  activo !== null && activo !== i && 'opacity-50',
                )}
                style={{ height: `${alto * 100}%` }}
                initial={reducido ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: reducido ? 0 : 0.2 + i * 0.012, duration: motionDuration.reveal, ease: motionEase.enter }}
              />
            </span>
          )
        })}
      </div>
      <figcaption className={cn('flex items-baseline justify-between gap-2 text-caption', t.muted)} aria-hidden="true">
        {enFoco ? (
          <>
            <span>{fechaCorta(enFoco.fecha)}</span>
            <span className={cn('font-mono tabular-nums', t.fg)}>{pesos(enFoco.cop)}</span>
          </>
        ) : (
          <>
            <span>{T.recuperado30}</span>
            <span className="font-mono tabular-nums">{pesos(total)}</span>
          </>
        )}
      </figcaption>
    </figure>
  )
}

// ── El negocio este mes ────────────────────────────────────────────────────

export function TarjetaDelNegocio({ ind, datos, className }: { ind: IndicadoresDelMando; datos: DatosDelMando; className?: string }) {
  const { t } = useI18n()
  const sinPiezas = !datos.tendencias && !datos.recaudo
  if (sinPiezas) return null
  return (
    <section className={cn('min-w-0 space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm', className)} aria-label={T.negocio}>
      <MonoLabel>{T.negocio}</MonoLabel>

      {/* El recaudo del mes: lo mide el back; aquí sólo se pinta con su rótulo. */}
      {datos.recaudo && !datos.recaudo.notAvailable && (
        <EnPieza pieza={datos.recaudo} queEs={T.recaudo} alto={120}>
          {() =>
            ind.recaudo ? (
              <div className="flex items-center gap-4" data-testid="mando-recaudo-del-mes">
                <div className="shrink-0">
                  <Medidor
                    tamano={104}
                    valor={ind.recaudo.pct === null ? null : ind.recaudo.pct / 100}
                    centro={ind.recaudo.pct === null ? '—' : <Cifra valor={ind.recaudo.pct} formato={(v) => `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })}\u00a0%`} />}
                    etiqueta={T.recaudo}
                    descripcion={
                      ind.recaudo.pct === null
                        ? `${T.recaudo}: ${T.recaudoSinDato}`
                        : `${T.recaudo}: ${ind.recaudo.pct.toLocaleString('es-CO', { maximumFractionDigits: 1 })}\u00a0%, ${t(claveDelRotulo(ind.recaudo.base))}`
                    }
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-body-sm font-medium text-fg">{t(claveDelRotulo(ind.recaudo.base))}</p>
                  <p className="text-caption text-fg-muted">
                    {ind.recaudo.pct === null ? T.recaudoSinDato : fraseDeLasCifras(ind.recaudo, t, formatCurrency)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-body-sm text-fg-subtle">{TEXTOS.pieza.sinDato}</p>
            )
          }
        </EnPieza>
      )}

      {datos.tendencias && (
        <EnPieza pieza={datos.tendencias} queEs={T.queEs} alto={140}>
          {() => (
            <div className="space-y-5">
              {/* La mora de más de 30 días y su tendencia (la `mora_30` del director, al momento). */}
              <div className="space-y-1.5 border-t border-border-faint pt-4" data-testid="mando-mora">
                <p className="text-label font-mono uppercase tracking-wide text-fg-muted">{T.mora}</p>
                {ind.mora ? (
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <Cifra valor={ind.mora.saldo} formato={pesos} className="text-[22px] font-semibold leading-tight text-fg" />
                      <p className="flex items-center gap-1.5 text-caption text-fg-muted">
                        {ind.mora.cambio > 0 ? (
                          <TrendUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : ind.mora.cambio < 0 ? (
                          <TrendDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {ind.mora.cambio > 0
                            ? T.moraSube(pesos(ind.mora.cambio), ind.mora.diasDeLaSerie)
                            : ind.mora.cambio < 0
                              ? T.moraBaja(pesos(-ind.mora.cambio), ind.mora.diasDeLaSerie)
                              : T.moraIgual(ind.mora.diasDeLaSerie)}
                          {ind.mora.dias !== null ? ` · ${T.moraNota(`${ind.mora.dias.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${ind.mora.dias === 1 ? 'día' : 'días'}`)}` : ''}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 text-fg-muted">
                      <Sparkline values={ind.mora.serie} width={96} height={32} color="currentColor" aria-hidden="true" />
                    </span>
                  </div>
                ) : (
                  <p className="text-body-sm text-fg-subtle">{datos.tendencias?.data?.mora ? T.moraSinSerie : TEXTOS.pieza.sinDato}</p>
                )}
              </div>

              {/* Las horas ahorradas (v2): medidas + estimadas, con su supuesto escrito. */}
              <div className="space-y-1.5 border-t border-border-faint pt-4" data-testid="mando-horas">
                <p className="flex items-center gap-2 text-label font-mono uppercase tracking-wide text-fg-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {T.horas}
                </p>
                {ind.horas ? (
                  <div className="space-y-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-mono text-[22px] font-semibold leading-tight tabular-nums text-fg">
                        {horasEnPalabras(ind.horas.total ?? ind.horas.medidas)}
                      </span>
                      <span className="text-caption text-fg-muted">{T.horasVentana}</span>
                      {ind.horas.estimada && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-caption text-fg-muted">{T.estimada}</span>
                      )}
                    </p>
                    <p className="text-caption text-fg-muted">
                      {T.medidas(horasEnPalabras(ind.horas.medidas))}
                      {ind.horas.estimadas !== null ? ` · ${T.estimadas(horasEnPalabras(ind.horas.estimadas))}` : ''}
                    </p>
                    {ind.horas.estimadas === null && <p className="text-caption text-fg-subtle">{T.horasSinEstimar}</p>}
                    <details className="group text-caption text-fg-muted">
                      <summary className="w-fit cursor-pointer rounded-sm underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {T.supuesto}
                      </summary>
                      <p className="mt-1 max-w-prose text-fg-muted">{ind.horas.supuesto}</p>
                    </details>
                  </div>
                ) : (
                  <p className="text-body-sm text-fg-subtle">{TEXTOS.pieza.sinDato}</p>
                )}
              </div>
            </div>
          )}
        </EnPieza>
      )}
    </section>
  )
}

// ── El ritmo de los agentes ────────────────────────────────────────────────

/** Las series en orden fijo (nunca rotadas): el cobalto es siempre el agente que más hizo. */
const COLORES = ['bg-indigo-500 dark:bg-indigo-400', 'bg-cyan-600', 'bg-amber-600', 'bg-violet-600 dark:bg-violet-500'] as const
const OTROS = 'bg-border-strong'
const SERIES = COLORES.length

export function RitmoDeLosAgentes({ ind, datos, className }: { ind: IndicadoresDelMando; datos: DatosDelMando; className?: string }) {
  const nombre = useNombreDeAgente()
  const reducido = usePrefersReducedMotion()
  const [activo, setActivo] = useState<number | null>(null)
  if (!datos.tendencias) return null
  return (
    <section className={cn('min-w-0 space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm', className)} aria-label={T.ritmo}>
      <div className="space-y-1">
        <MonoLabel>{T.ritmo}</MonoLabel>
        <p className="text-caption text-fg-muted">{T.ritmoBajada}</p>
      </div>
      <EnPieza pieza={datos.tendencias} queEs={T.ritmo} alto={160}>
        {() => {
          const acciones = ind.acciones
          if (!acciones || acciones.barras.every((b) => b.solos === 0 && b.conPersona === 0)) {
            return <p className="text-body-sm text-fg-muted">{acciones ? T.ritmoVacio : TEXTOS.pieza.sinDato}</p>
          }
          const destacados = acciones.agentes.slice(0, SERIES)
          const conOtros = acciones.agentes.length > SERIES
          const max = Math.max(1, ...acciones.barras.map((b) => b.solos))
          const enFoco = activo !== null ? acciones.barras[activo] : null
          const conPersona = acciones.barras.reduce((s, b) => s + b.conPersona, 0)
          const resumen = acciones.barras.map((b) => T.ritmoDia(fechaCorta(b.fecha), b.solos)).join('; ')
          return (
            <div className="space-y-3">
              {/* La leyenda (siempre: hay varias series), con el nombre de cada agente. */}
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-caption text-fg-muted" aria-label="Agentes">
                {destacados.map((a, i) => (
                  <li key={a} className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={unir('h-2.5 w-2.5 rounded-[3px]', COLORES[i])} />
                    {nombre(a)}
                  </li>
                ))}
                {conOtros && (
                  <li className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={unir('h-2.5 w-2.5 rounded-[3px]', OTROS)} />
                    Otros
                  </li>
                )}
              </ul>

              <div role="img" aria-label={`${T.ritmoBajada}. ${resumen}.`} className="flex h-32 items-end gap-1.5" onMouseLeave={() => setActivo(null)}>
                {acciones.barras.map((b, i) => (
                  <Columna
                    key={b.fecha}
                    barra={b}
                    max={max}
                    destacados={destacados}
                    indice={i}
                    activo={activo}
                    reducido={reducido}
                    onActivar={() => setActivo(i)}
                  />
                ))}
              </div>
              <div className="flex gap-1.5" aria-hidden="true">
                {acciones.barras.map((b) => (
                  <span key={b.fecha} className={cn('flex-1 truncate text-center font-mono text-label leading-none text-fg-subtle', b.esHoy && 'font-medium text-fg-muted')}>
                    {b.esHoy ? 'hoy' : diaCorto(b.fecha)}
                  </span>
                ))}
              </div>

              <p className="min-h-[1.25rem] text-caption text-fg-muted" aria-hidden="true">
                {enFoco ? (
                  <>
                    <span className="font-medium text-fg">{fechaCorta(enFoco.fecha)}</span>
                    {' · '}
                    {enFoco.porAgente.length > 0
                      ? enFoco.porAgente
                          .slice(0, 4)
                          .map((a) => `${nombre(a.agente)} ${a.n}`)
                          .join(', ')
                      : '0'}
                    {enFoco.conPersona > 0 ? ` · ${T.ritmoConPersona(enFoco.conPersona)}` : ''}
                    {enFoco.esHoy ? ` · ${T.ritmoHoy}` : ''}
                  </>
                ) : conPersona > 0 ? (
                  T.ritmoConPersona(conPersona)
                ) : null}
              </p>
              {acciones.recortada && <p className="text-caption text-fg-subtle">{T.ritmoRecortada}</p>}
            </div>
          )
        }}
      </EnPieza>
    </section>
  )
}

function Columna({
  barra,
  max,
  destacados,
  indice,
  activo,
  reducido,
  onActivar,
}: {
  barra: BarraDeAcciones
  max: number
  destacados: string[]
  indice: number
  activo: number | null
  reducido: boolean
  onActivar: () => void
}) {
  // Los segmentos, de abajo hacia arriba en el orden de la leyenda; lo que no está en la leyenda, «Otros» arriba.
  const segmentos = destacados
    .map((a, i) => ({ clave: a, n: barra.porAgente.find((x) => x.agente === a)?.n ?? 0, color: COLORES[i] as string }))
    .filter((s) => s.n > 0)
  const otros = barra.porAgente.filter((x) => !destacados.includes(x.agente)).reduce((s, x) => s + x.n, 0)
  if (otros > 0) segmentos.push({ clave: 'otros', n: otros, color: OTROS })
  const alto = barra.solos / max
  return (
    <span className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={onActivar}>
      <motion.span
        aria-hidden="true"
        className={cn(
          'flex w-full origin-bottom flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]',
          barra.esHoy && 'outline outline-1 outline-offset-2 outline-border-strong',
          activo !== null && activo !== indice && 'opacity-50',
        )}
        style={{ height: `${Math.max(barra.solos > 0 ? 4 : 0, alto * 100)}%` }}
        initial={reducido ? false : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: reducido ? 0 : 0.1 + indice * 0.03, duration: motionDuration.reveal, ease: motionEase.enter }}
      >
        {segmentos.map((s) => (
          <span key={s.clave} className={cn('block w-full shrink-0', s.color)} style={{ flexGrow: s.n, flexBasis: 0 }} />
        ))}
      </motion.span>
      {barra.solos === 0 && <span aria-hidden="true" className="block h-[2px] w-full rounded-full bg-border" />}
    </span>
  )
}
