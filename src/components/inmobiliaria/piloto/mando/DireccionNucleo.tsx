'use client'

/**
 * Dirección A · NÚCLEO — el piloto automático en el centro.
 *
 * Una consola sobre la superficie de marca (`bg-ink`, la misma en claro y
 * oscuro, con grano y un resplandor cobalto: DESIGN.md permite el degradado de
 * marca en héroes). En el centro, el orbe del piloto automático (la Nebulosa
 * TAL CUAL) con un halo del color del estado y dos anillos que giran. A los
 * lados, cuatro medidores. Debajo, la voz del día dicha palabra por palabra,
 * la franja de telemetría en vivo y dos paneles de cristal: lo que te necesita
 * y lo que hicieron solos hoy.
 *
 * ⚠️ Cristal: DESIGN.md §1 prohíbe el cristal en contenido. Aquí va SÓLO
 * sobre el héroe de marca (lo autorizó main el 05-10 para esta propuesta) y se
 * le marca a Nico en la entrega.
 *
 * Cada número aparece una vez:
 *   · Plan del día → órdenes hechas / vivas (director);
 *   · Metas → avance medio de las activas (director);
 *   · Decisiones que esperan → total de la Bandeja; nota: altas y atrasadas;
 *     anillo: resueltas hoy (pulso) sobre resueltas + esperan;
 *   · Agentes en servicio → corren y su modo los gobierna (flota);
 *   · Recuperado este mes → briefing (sólo si el micro lo manda);
 *   · telemetría → llamadas, conversaciones, contactos planeados (pulso) y
 *     acuerdos de hoy (briefing);
 *   · alertas por severidad → pulso (sin la de las decisiones);
 *   · hicieron solos hoy → acciones de hoy por agente (feed).
 */

import { Lightning, Power, Tray, WarningCircle, WarningOctagon, Info, ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Stagger, StaggerItem, motionDistance, motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import { agenteDeLaAutonomia } from '@/lib/agentes/equipo'
import type { PulsoAlerta, PulsoSeveridad } from '@/lib/api/piloto'
import { cn } from '@/lib/utils'

import { fechaDeHoy, horaCorta, porcentaje } from './calculos'
import { indicadoresDelMando } from './indicadores'
import {
  BarraDeAvance,
  Cifra,
  EnPieza,
  FilaDeDecision,
  ListaEnVivo,
  Medidor,
  PuntoDeEstado,
  Reloj,
  pesos,
  useAhora,
  useBucleVivo,
  useNombreDeAgente,
} from './piezas'
import { OrbeDelPilotoConPopover } from './popovers'
import { Ticker } from './ticker'
import { TEXTOS } from './textos'
import type { PropsDeDireccion } from './tipos'
import { Voz } from './voz'

/** El grano de la marca (el mismo `feTurbulence` de Cadence). */
const GRANO =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='160'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.85'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23n)'/%3E%3C/svg%3E\")"

const CRISTAL =
  'rounded-lg border border-ink-border bg-[color-mix(in_srgb,var(--ink-fg)_6%,transparent)] backdrop-blur-md'

const SEVERIDADES: Array<{ s: PulsoSeveridad; color: string }> = [
  { s: 'critica', color: 'var(--danger)' },
  { s: 'alta', color: 'var(--danger)' },
  { s: 'media', color: 'var(--warning)' },
  { s: 'info', color: 'var(--info)' },
]

const ICONO_DE_SEVERIDAD = { critica: WarningOctagon, alta: WarningCircle, media: WarningCircle, info: Info } as const

export interface PropsDelNucleo extends PropsDeDireccion {
  /**
   * `completa` (la dirección A de la fase 1): con los paneles de cristal y la
   * activación debajo. `cabecera` (la pantalla elegida por Nico, 05-10): sólo
   * el núcleo — barra de arriba, medidores, orbe, voz, recuperado y telemetría —
   * sin las píldoras de severidad (las dice la tarjeta «Alertas»: cada número
   * una vez), sin los paneles (los dicen «Lo urgente» y «En vivo») y sin la
   * activación (la pone la pantalla).
   */
  variante?: 'completa' | 'cabecera'
}

export function DireccionNucleo({ datos, acciones, activacion, variante = 'completa' }: PropsDelNucleo) {
  const completa = variante === 'completa'
  const ahora = useAhora(30_000)
  const ind = indicadoresDelMando(datos, ahora)
  const reducido = usePrefersReducedMotion()
  const nombre = useNombreDeAgente()
  const apagado = ind.estado === 'apagado'
  // El resplandor respira sólo en pantalla y con movimiento (el bucle se pausa fuera de vista).
  const { ref: refDelHeroe, vivo } = useBucleVivo<HTMLElement>()

  const resueltas = ind.hoy?.resueltas ?? null
  const despeje =
    ind.esperan !== null && resueltas !== null && resueltas + ind.esperan > 0 ? resueltas / (resueltas + ind.esperan) : ind.esperan !== null && resueltas !== null ? 0 : null

  const medidores = {
    plan: (
      <Medidor
        tono="tinta"
        valor={ind.plan?.avance ?? null}
        centro={ind.plan ? <span className="font-mono tabular-nums">{`${ind.plan.hechas}/${ind.plan.total - ind.plan.fuera}`}</span> : '—'}
        etiqueta={TEXTOS.kpi.plan}
        nota={ind.plan ? 'órdenes hechas' : ind.directorEncendido ? TEXTOS.director.sinPlan : 'sin director'}
        descripcion={ind.plan ? `Plan del día: ${ind.plan.hechas} de ${ind.plan.total - ind.plan.fuera} órdenes hechas` : 'Plan del día: sin dato'}
      />
    ),
    metas: (
      <Medidor
        tono="tinta"
        valor={ind.avanceDeMetas?.avance ?? null}
        centro={ind.avanceDeMetas ? <Cifra valor={Math.round(ind.avanceDeMetas.avance * 100)} formato={(v) => `${Math.round(v)} %`} /> : '—'}
        etiqueta={TEXTOS.kpi.metas}
        nota={ind.avanceDeMetas ? TEXTOS.kpi.metasDe(ind.avanceDeMetas.n) : 'sin metas'}
        descripcion={ind.avanceDeMetas ? `Metas: avance medio ${porcentaje(ind.avanceDeMetas.avance)}` : 'Metas: sin dato'}
      />
    ),
    decisiones: (
      <Medidor
        tono="tinta"
        valor={despeje}
        centro={ind.esperan !== null ? <Cifra valor={ind.esperan} /> : '—'}
        etiqueta={TEXTOS.kpi.esperan}
        nota={
          ind.esperan !== null
            ? `${TEXTOS.kpi.altasN(ind.altas ?? 0)} · ${ind.atrasadas ? TEXTOS.kpi.atrasadasN(ind.atrasadas) : TEXTOS.kpi.ningunaAtrasada}`
            : TEXTOS.pieza.sinDato
        }
        descripcion={
          ind.esperan !== null
            ? `${ind.esperan} decisiones esperan; el anillo muestra las resueltas hoy: ${resueltas ?? 0}`
            : 'Decisiones: sin dato'
        }
      />
    ),
    agentes: (
      <Medidor
        tono="tinta"
        valor={ind.flota && ind.flota.encendidos > 0 ? ind.flota.actuan / ind.flota.encendidos : null}
        centro={ind.flota ? <Cifra valor={ind.flota.actuan} /> : '—'}
        etiqueta="Agentes en servicio"
        nota={ind.flota ? TEXTOS.kpi.agentesDe(ind.flota.encendidos) : TEXTOS.pieza.sinDato}
        descripcion={ind.flota ? `${ind.flota.actuan} de ${ind.flota.encendidos} agentes encendidos en servicio` : 'Agentes: sin dato'}
      />
    ),
  }

  return (
    <div className="space-y-5" data-testid={completa ? 'mando-nucleo' : 'mando-nucleo-cabecera'}>
      <section
        ref={refDelHeroe}
        className="relative isolate overflow-hidden rounded-xl border border-ink-border bg-ink text-ink-fg shadow-lg"
        aria-label="Centro de mando del piloto automático"
      >
        {/* Fondo de marca: resplandor cobalto que respira + grano. Decorativo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <motion.div
            className="absolute left-1/2 top-[28%] h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, hsl(var(--primary)) 30%, transparent) 0%, transparent 62%)' }}
            initial={false}
            animate={!vivo || apagado ? { opacity: apagado ? 0.35 : 0.8 } : { opacity: [0.65, 1, 0.65] }}
            transition={!vivo || apagado ? { duration: motionDuration.slow } : { duration: motionDuration.ambient * 2.5, repeat: Infinity, ease: motionEase.standard }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--ink-2) 80%, transparent), transparent)' }}
          />
          <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRANO }} />
        </div>

        {/* ── Barra de arriba: qué es, en qué está, alertas y la hora ── */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-border px-5 py-3.5 sm:px-7">
          <div className="flex min-w-0 items-center gap-2.5">
            <PuntoDeEstado estado={ind.estado} late={ind.enCurso.length > 0} />
            <span className="font-mono text-label uppercase tracking-wide text-ink-fg">
              Piloto automático · {TEXTOS.estado[ind.estado]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {completa && ind.porSeveridad && (
              <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label={TEXTOS.kpi.alertas}>
                {SEVERIDADES.filter(({ s }) => (ind.porSeveridad?.[s] ?? 0) > 0).map(({ s, color }) => (
                  <li key={s} className="inline-flex items-center gap-1.5 text-caption text-ink-fg-muted">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    <span className="font-mono tabular-nums text-ink-fg">{ind.porSeveridad?.[s]}</span> {TEXTOS.kpi.severidadN(s, ind.porSeveridad?.[s] ?? 0)}
                  </li>
                ))}
                {SEVERIDADES.every(({ s }) => (ind.porSeveridad?.[s] ?? 0) === 0) && (
                  <li className="text-caption text-ink-fg-muted">{TEXTOS.kpi.sinAlertas}</li>
                )}
              </ul>
            )}
            <span className="hidden text-caption text-ink-fg-muted sm:inline">{fechaDeHoy(new Date(ahora))}</span>
            <Reloj tono="tinta" />
          </div>
        </header>

        {/* ── El núcleo: medidores · orbe · medidores ──
            En el teléfono el orbe va arriba y los medidores de a dos debajo
            (se reacomoda, no se encoge). */}
        <div className="px-5 pt-8 sm:px-7">
          <Stagger className="flex flex-col items-center gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6">
            <StaggerItem key="izq" className="order-2 grid w-full grid-cols-2 gap-4 lg:order-1 lg:grid-cols-1 lg:justify-items-end lg:gap-7">
              {medidores.plan}
              {medidores.metas}
            </StaggerItem>
            <StaggerItem key="orbe" className="order-1 lg:order-2">
              {/* Con el puntero o el foco reacciona y abre el estado del piloto (Nico, 05-10 19:30). */}
              <OrbeDelPilotoConPopover ind={ind} datos={datos} acciones={acciones} tamano={184} conAnillos tono="tinta" />
            </StaggerItem>
            <StaggerItem key="der" className="order-3 grid w-full grid-cols-2 gap-4 lg:grid-cols-1 lg:justify-items-start lg:gap-7">
              {medidores.decisiones}
              {medidores.agentes}
            </StaggerItem>
          </Stagger>
        </div>

        {/* ── La voz del día ── */}
        <div className="mx-auto max-w-3xl px-5 pb-6 pt-4 text-center sm:px-7">
          {apagado ? (
            <div className="space-y-3">
              <p className="font-mono text-label uppercase tracking-wide text-ink-fg-muted">{TEXTOS.voz.apagado}</p>
              <Voz como="h2" texto={ind.fraseDelPiloto ?? TEXTOS.voz.apagadoBajada} className="text-balance text-xl font-semibold leading-snug tracking-[-0.015em] text-ink-fg sm:text-2xl" />
              <p className="mx-auto max-w-xl text-body-sm text-ink-fg-muted">{TEXTOS.voz.apagadoBajada}</p>
              {/* Sólo si se puede (QA-PILOTO-95): con Leasefy apagado o la prueba terminada, la frase del micro y nada más. */}
              {activacion && ind.sePuedeEncender && (
                <Button asChild size="sm" variant="secondary" hideArrow>
                  <a href="#piloto-activacion">
                    <Power weight="bold" className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {TEXTOS.activar.invitacion}
                  </a>
                </Button>
              )}
            </div>
          ) : ind.voz ? (
            <div className="space-y-2.5">
              <p className="font-mono text-label uppercase tracking-wide text-ink-fg-muted">
                {ind.voz.quien === 'director'
                  ? TEXTOS.voz.director(ind.voz.desde ? horaCorta(new Date(ind.voz.desde)) : null)
                  : ind.voz.quien === 'gerente'
                    ? 'La lectura del día'
                    : TEXTOS.voz.pulso}
              </p>
              <Voz como="h2" texto={ind.voz.texto} className="text-balance text-xl font-semibold leading-snug tracking-[-0.015em] text-ink-fg sm:text-[26px] sm:leading-[1.25]" />
            </div>
          ) : (
            <EnPieza pieza={datos.pulso} queEs={TEXTOS.queEs.pulso} tono="tinta" alto={56}>
              {() => null}
            </EnPieza>
          )}
          {ind.recuperado !== null && (
            <p className="mt-4 inline-flex items-baseline gap-2 text-ink-fg-muted">
              <span className="font-mono text-label uppercase tracking-wide">{TEXTOS.kpi.recuperado}</span>
              <Cifra valor={ind.recuperado} formato={pesos} className="text-xl font-semibold text-ink-fg" />
            </p>
          )}
        </div>

        {/* ── Telemetría en vivo ── */}
        <div className={cn('flex flex-col gap-3 border-t border-ink-border bg-[color-mix(in_srgb,var(--ink-fg)_3%,transparent)] px-5 py-3.5 sm:px-7 lg:flex-row lg:items-center lg:gap-6', completa && 'border-b')}>
          <div className="flex shrink-0 items-center gap-2">
            <Lightning weight="fill" className="h-3.5 w-3.5 text-ink-fg-muted" aria-hidden="true" />
            <span className="font-mono text-label uppercase tracking-wide text-ink-fg-muted">{TEXTOS.enVivo.telemetria}</span>
          </div>
          {ind.hoy ? (
            <dl className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-1 sm:flex sm:flex-wrap">
              {(
                [
                  [TEXTOS.kpi.llamadas, ind.hoy.llamadas],
                  [TEXTOS.kpi.conversaciones, ind.hoy.conversaciones],
                  [TEXTOS.kpi.planeados, ind.hoy.planeados],
                  [TEXTOS.kpi.promesas, ind.hoy.promesas],
                ] as const
              )
                .filter(([, v]) => v !== null)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="sr-only">{k}</dt>
                    <dd className="flex items-baseline gap-1.5">
                      <Cifra valor={v as number} className="text-body font-semibold text-ink-fg" />
                      <span aria-hidden="true" className="text-caption text-ink-fg-muted">{k.toLocaleLowerCase('es')}</span>
                    </dd>
                  </div>
                ))}
            </dl>
          ) : null}
          <div className="hidden h-5 w-px bg-ink-border lg:block" aria-hidden="true" />
          <Ticker enCurso={ind.enCurso} actividad={ind.actividad} tono="tinta" className="min-w-0 flex-1" />
        </div>

        {completa && (
        // ── Paneles de cristal ──
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
          <motion.section
            className={cn(CRISTAL, 'min-w-0 p-4 sm:p-5')}
            aria-labelledby="nucleo-te-necesitan"
            initial={reducido ? false : { opacity: 0, y: motionDistance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: motionDuration.slow, ease: motionEase.enter }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 id="nucleo-te-necesitan" className="flex items-center gap-2 text-body font-semibold text-ink-fg">
                <Tray weight="duotone" className="h-4 w-4 text-ink-fg-muted" aria-hidden="true" />
                {TEXTOS.bandeja.titulo}
              </h3>
            </div>
            {ind.alertas.length > 0 && (
              <ul className="mb-2 space-y-1.5" aria-label={TEXTOS.kpi.alertas}>
                {ind.alertas.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <FilaDeAlertaEnTinta alerta={a} onAbrir={() => acciones.abrirAlerta(a)} />
                  </li>
                ))}
              </ul>
            )}
            <EnPieza pieza={datos.bandeja} queEs={TEXTOS.queEs.bandeja} tono="tinta">
              {() =>
                ind.urgentes.length === 0 ? (
                  <p className="py-3 text-body-sm text-ink-fg-muted">{TEXTOS.bandeja.vacio}</p>
                ) : (
                  <ul className="divide-y divide-ink-border">
                    {ind.urgentes.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        <FilaDeDecision item={item} tono="tinta" onAbrir={acciones.abrirItem} ahora={ahora} />
                      </li>
                    ))}
                  </ul>
                )
              }
            </EnPieza>
          </motion.section>

          <motion.section
            className={cn(CRISTAL, 'min-w-0 p-4 sm:p-5')}
            aria-labelledby="nucleo-solos"
            initial={reducido ? false : { opacity: 0, y: motionDistance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: motionDuration.slow, ease: motionEase.enter }}
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 id="nucleo-solos" className="text-body font-semibold text-ink-fg">
                {TEXTOS.solos.titulo}
              </h3>
              {ind.solosHoy && ind.solosHoy.total > 0 && (
                <span className="text-caption text-ink-fg-muted">
                  <Cifra valor={ind.solosHoy.total} className="text-ink-fg" /> {ind.solosHoy.total === 1 ? 'acción' : 'acciones'}
                </span>
              )}
            </div>
            <EnPieza pieza={datos.actividad} queEs={TEXTOS.queEs.actividad} tono="tinta">
              {() =>
                ind.solosHoy && ind.solosHoy.porAgente.length > 0 ? (
                  <div className="space-y-4">
                    <ul className="space-y-2.5">
                      {ind.solosHoy.porAgente.slice(0, 5).map((s) => {
                        const max = ind.solosHoy?.porAgente[0]?.n ?? 1
                        const a = agenteDeLaAutonomia(s.agente)
                        return (
                          <li key={s.agente} className="flex items-center gap-3">
                            {a ? <OrbeDeAgente agente={a} tamano={20} quieto decorativo /> : <span className="h-5 w-5" />}
                            <span className="w-28 shrink-0 truncate text-body-sm text-ink-fg">{nombre(s.agente)}</span>
                            <BarraDeAvance valor={s.n / max} tono="tinta" className="flex-1" etiqueta={`${nombre(s.agente)}: ${s.n}`} />
                            <span className="w-6 shrink-0 text-right font-mono text-caption tabular-nums text-ink-fg-muted">{s.n}</span>
                          </li>
                        )
                      })}
                    </ul>
                    {ind.solosHoy.recortado && <p className="text-caption text-ink-fg-muted">{TEXTOS.solos.recortado}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-body-sm text-ink-fg-muted">{TEXTOS.solos.vacio}</p>
                    {ind.actividad.length > 0 && (
                      <>
                        <p className="font-mono text-label uppercase tracking-wide text-ink-fg-muted">Lo último</p>
                        <ListaEnVivo items={ind.actividad} maximo={4} tono="tinta" compacta onAbrir={acciones.abrirItem} />
                      </>
                    )}
                  </div>
                )
              }
            </EnPieza>
          </motion.section>
        </div>
        )}
      </section>

      {completa && activacion}
    </div>
  )
}

function FilaDeAlertaEnTinta({ alerta, onAbrir }: { alerta: PulsoAlerta; onAbrir: () => void }) {
  const Icono = ICONO_DE_SEVERIDAD[alerta.severidad] ?? WarningCircle
  const color = SEVERIDADES.find((x) => x.s === alerta.severidad)?.color ?? 'var(--danger)'
  return (
    <Button
      variant="ghost"
      hideArrow
      onClick={onAbrir}
      className="h-auto w-full justify-start gap-2.5 rounded-md px-2 py-2 text-left font-normal hover:bg-[color-mix(in_srgb,var(--ink-fg)_8%,transparent)]"
    >
      <Icono weight="fill" className="mt-0.5 h-4 w-4 shrink-0 self-start" style={{ color }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium text-ink-fg">{alerta.titulo}</span>
        <span className="block truncate text-caption text-ink-fg-muted">{alerta.detalle}</span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-fg-muted" aria-hidden="true" />
    </Button>
  )
}
