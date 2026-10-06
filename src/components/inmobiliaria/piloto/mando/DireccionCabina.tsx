'use client'

/**
 * Dirección B · CABINA — una sala de operaciones: todo a la vista, en una
 * grilla densa tipo bento, sobre las superficies del panel (claro y oscuro).
 *
 *   · arriba, la franja de estado: el orbe del piloto automático, su estado,
 *     la voz del día, las alertas por severidad y la hora;
 *   · el plan del director con el avance de sus órdenes y sus metas (con la
 *     serie de cada meta: la ÚNICA serie diaria que manda el micro);
 *   · cuatro indicadores y la cinta de lo que va del día;
 *   · lo urgente de la Bandeja con su acción, y el en vivo;
 *   · la tripulación: cada agente con su orbe, su modo y lo último que hizo.
 *
 * Cada número una vez (la lista por pieza está arriba de cada una).
 */

import { useMemo, useState } from 'react'
import { Pulse, Tray, Target, UsersThree, WarningCircle, WarningOctagon, Info, ArrowRight, Power } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { MonoLabel, Sparkline, Stagger, StaggerItem, motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import { agenteDeLaAutonomia } from '@/lib/agentes/equipo'
import type { PulsoAlerta, PulsoSeveridad } from '@/lib/api/piloto'
import type { MetaDelDirector, OrdenDelDirector } from '@/lib/api/piloto-director'
import { valorDeMeta } from '@/lib/piloto/director'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { avanceDeMeta, horaCorta, horaDelCuando, porcentaje } from './calculos'
import { indicadoresDelMando, type IndicadoresDelMando } from './indicadores'
import { BarraDeAvance, Cifra, EnPieza, FilaDeDecision, ListaEnVivo, OrbeDelPiloto, PuntoDeEstado, Reloj, pesos, unir, useAhora, useNombreDeAgente } from './piezas'
import { TEXTOS } from './textos'
import type { PropsDeDireccion } from './tipos'
import { TripulanteConPopover } from './popovers'
import { Voz } from './voz'

export const TARJETA = 'min-w-0 rounded-lg border border-border bg-surface shadow-sm'

/** Abre en un cajón lo que la tarjeta resume (la Bandeja entera, la actividad, el director). */
function AbrirEnCajon({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" hideArrow onClick={onClick} className="-mr-2 h-8 shrink-0 gap-1 px-2 text-fg-muted hover:text-fg">
      {texto}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Button>
  )
}

const SEVERIDADES: Array<{ s: PulsoSeveridad; color: string }> = [
  { s: 'critica', color: 'var(--danger)' },
  { s: 'alta', color: 'var(--danger)' },
  { s: 'media', color: 'var(--warning)' },
  { s: 'info', color: 'var(--info)' },
]

export function DireccionCabina({ datos, acciones, activacion }: PropsDeDireccion) {
  const ahora = useAhora(30_000)
  const ind = indicadoresDelMando(datos, ahora)
  const apagado = ind.estado === 'apagado'

  return (
    <div className="space-y-4" data-testid="mando-cabina">
      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ── La franja de estado ── */}
        <StaggerItem key="estado" className={cn(TARJETA, 'lg:col-span-12')}>
          <FranjaDeEstado ind={ind} />
        </StaggerItem>

        {/* ── El plan del director ── */}
        <StaggerItem key="plan" className={cn(TARJETA, 'p-5 lg:col-span-7 lg:row-span-2')}>
          <PlanDelDirector ind={ind} datos={datos} apagado={apagado} conActivacion={Boolean(activacion)} />
        </StaggerItem>

        {/* ── Indicadores ── */}
        <StaggerItem key="kpis" className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-5">
          <Indicadores ind={ind} />
        </StaggerItem>

        {/* ── Lo que va del día ── */}
        <StaggerItem key="hoy" className={cn(TARJETA, 'p-5 lg:col-span-5')}>
          <LoDelDia ind={ind} datos={datos} />
        </StaggerItem>

        {/* ── Lo urgente ── */}
        <StaggerItem key="urgente" className={cn(TARJETA, 'p-5 lg:col-span-7')}>
          <LoUrgente ind={ind} datos={datos} acciones={acciones} ahora={ahora} />
        </StaggerItem>

        {/* ── En vivo ── */}
        <StaggerItem key="vivo" className={cn(TARJETA, 'p-5 lg:col-span-5')}>
          <EnVivo ind={ind} datos={datos} acciones={acciones} />
        </StaggerItem>

        {/* ── La tripulación ── */}
        <StaggerItem key="tripulacion" className={cn(TARJETA, 'p-5 lg:col-span-12')}>
          <Tripulacion ind={ind} datos={datos} acciones={acciones} />
        </StaggerItem>
      </Stagger>

      {activacion}
    </div>
  )
}

// ── La franja de estado ────────────────────────────────────────────────────

function FranjaDeEstado({ ind }: { ind: IndicadoresDelMando }) {
  const apagado = ind.estado === 'apagado'
  const texto = apagado ? (ind.fraseDelPiloto ?? TEXTOS.voz.apagado) : ind.voz?.texto
  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <div className="flex items-center gap-4">
        <OrbeDelPiloto estado={ind.estado} orbe={ind.orbe} tamano={56} />
        <div className="min-w-0 sm:hidden">
          <EstadoYHora ind={ind} />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="hidden sm:block">
          <EstadoYHora ind={ind} />
        </div>
        {texto && <Voz texto={texto} className="text-balance text-body-lg font-semibold leading-snug tracking-[-0.01em] text-fg" />}
      </div>
      {ind.porSeveridad && (
        <ul className="flex shrink-0 flex-wrap gap-2 sm:max-w-[260px] sm:justify-end" aria-label={TEXTOS.kpi.alertas}>
          {SEVERIDADES.filter(({ s }) => (ind.porSeveridad?.[s] ?? 0) > 0).map(({ s, color }) => (
            <li key={s} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-caption text-fg-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              <span className="font-mono tabular-nums text-fg">{ind.porSeveridad?.[s]}</span> {TEXTOS.kpi.severidadN(s, ind.porSeveridad?.[s] ?? 0)}
            </li>
          ))}
          {SEVERIDADES.every(({ s }) => (ind.porSeveridad?.[s] ?? 0) === 0) && (
            <li className="rounded-full border border-border px-2.5 py-1 text-caption text-fg-muted">{TEXTOS.kpi.sinAlertas}</li>
          )}
        </ul>
      )}
    </div>
  )
}

function EstadoYHora({ ind }: { ind: IndicadoresDelMando }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-2">
        <PuntoDeEstado estado={ind.estado} late={ind.enCurso.length > 0} />
        <MonoLabel>Piloto automático · {TEXTOS.estado[ind.estado]}</MonoLabel>
      </span>
      <Reloj />
    </div>
  )
}

// ── El plan del director ───────────────────────────────────────────────────

const COLORES_DEL_PLAN = {
  hechas: 'hsl(var(--primary))',
  agente: 'color-mix(in srgb, hsl(var(--primary)) 45%, var(--surface))',
  enBandeja: 'var(--warning)',
  fuera: 'var(--border-strong)',
} as const

export function PlanDelDirector({
  ind,
  datos,
  apagado,
  conActivacion,
  conAvance = true,
  onAbrir,
}: {
  ind: IndicadoresDelMando
  datos: PropsDeDireccion['datos']
  apagado: boolean
  conActivacion: boolean
  /**
   * El «33 % · de 9 órdenes hechas» de arriba y el número de «hechas» de la
   * leyenda. En la pantalla elegida los dice el medidor del núcleo: aquí no se
   * repiten (cada número una vez).
   */
  conAvance?: boolean
  /** Abre la tarjeta del director de siempre (replanear, metas, semana). */
  onAbrir?: () => void
}) {
  const reducido = usePrefersReducedMotion()
  const ahora = useAhora(60_000)
  const proximas = useMemo(() => {
    const ordenes = ind.director?.ordenes ?? []
    return ordenes
      .filter((o) => !['ejecutada', 'descartada', 'fallida', 'deshecha', 'vencida'].includes(String(o.estado)))
      .map((o) => ({ o, cuando: horaDelCuando(o.cuando, ahora) }))
      .sort((a, b) => (a.cuando.at?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.cuando.at?.getTime() ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 5)
  }, [ind.director, ahora])

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <MonoLabel>{TEXTOS.director.titulo}</MonoLabel>
          {ind.voz?.quien === 'director' && ind.voz.desde && (
            <p className="text-caption text-fg-subtle">{TEXTOS.voz.director(horaCorta(new Date(ind.voz.desde)))}</p>
          )}
        </div>
        {onAbrir && <AbrirEnCajon texto="Abrir el plan" onClick={onAbrir} />}
        {conAvance && ind.plan && (
          <p className="text-right">
            <Cifra valor={Math.round((ind.plan.avance ?? 0) * 100)} formato={(v) => `${Math.round(v)} %`} className="text-h1 font-semibold text-fg" />
            <span className="block text-caption text-fg-muted">{TEXTOS.kpi.planDe(ind.plan.total - ind.plan.fuera)}</span>
          </p>
        )}
      </div>

      <EnPieza pieza={datos.hoy} queEs={TEXTOS.queEs.director} alto={160}>
        {(hoy) =>
          !hoy.encendido ? (
            <div className="flex flex-1 flex-col justify-center gap-3 rounded-md bg-surface-muted p-5">
              <p className="text-body font-semibold text-fg">{TEXTOS.director.apagado}</p>
              <p className="max-w-xl text-body-sm text-fg-muted">{TEXTOS.director.apagadoBajada}</p>
              {apagado && conActivacion && ind.sePuedeEncender && (
                <div>
                  <Button asChild size="sm" hideArrow>
                    <a href="#piloto-activacion">
                      <Power weight="bold" className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {TEXTOS.activar.invitacion}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : !ind.plan ? (
            <p className="text-body-sm text-fg-muted">{hoy.ciclo?.estado === 'en_curso' ? TEXTOS.director.planeando : TEXTOS.director.sinPlan}</p>
          ) : (
            <div className="space-y-5">
              {/* La barra del plan: un segmento por estado, cada uno crece con scaleX. */}
              <div className="space-y-2.5">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`Plan: ${ind.plan.hechas} hechas, ${ind.plan.agente} las hace el agente, ${ind.plan.enBandeja} esperan tu clic, ${ind.plan.fuera} descartadas o fallidas`}>
                  {(['hechas', 'agente', 'enBandeja', 'fuera'] as const).map((k, i) =>
                    ind.plan && ind.plan[k] > 0 ? (
                      <motion.span
                        key={k}
                        className="h-full origin-left"
                        style={{ flexGrow: ind.plan[k], background: COLORES_DEL_PLAN[k] }}
                        initial={reducido ? false : { scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.12, duration: motionDuration.reveal, ease: motionEase.enter }}
                      />
                    ) : null,
                  )}
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-muted">
                  {(
                    [
                      ['hechas', TEXTOS.director.estados.hechas],
                      ['agente', TEXTOS.director.estados.agente],
                      ['enBandeja', TEXTOS.director.estados.enBandeja],
                      ['fuera', TEXTOS.director.estados.fuera],
                    ] as const
                  ).map(([k, label]) => (
                    <li key={k} className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: COLORES_DEL_PLAN[k] }} />
                      {conAvance || k !== 'hechas' ? <span className="font-mono tabular-nums text-fg">{ind.plan?.[k]}</span> : null} {label.toLocaleLowerCase('es')}
                    </li>
                  ))}
                </ul>
              </div>

              {proximas.length > 0 && (
                <div className="space-y-1">
                  <p className="text-label font-mono uppercase tracking-wide text-fg-muted">{TEXTOS.mision.loQueViene}</p>
                  <ul className="divide-y divide-border-faint">
                    {proximas.map(({ o, cuando }) => (
                      <li key={o.ordenId}>
                        <OrdenEnFila orden={o} hora={cuando.at ? horaCorta(cuando.at) : 'Hoy'} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        }
      </EnPieza>

      <div className="mt-auto space-y-3 border-t border-border-faint pt-4">
        <p className="flex items-center gap-2">
          <Target weight="duotone" className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          <MonoLabel>{TEXTOS.director.metasTitulo}</MonoLabel>
        </p>
        <EnPieza pieza={datos.metas} queEs={TEXTOS.queEs.metas} alto={80}>
          {() =>
            ind.metas.length === 0 ? (
              <p className="text-body-sm text-fg-muted">{ind.directorEncendido ? TEXTOS.director.sinMetas : 'Sin director, sin metas todavía.'}</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {ind.metas.slice(0, 4).map((m) => (
                  <li key={m.id}>
                    <MetaEnTarjeta meta={m} />
                  </li>
                ))}
              </ul>
            )
          }
        </EnPieza>
      </div>
    </div>
  )
}

function OrdenEnFila({ orden, hora }: { orden: OrdenDelDirector; hora: string }) {
  const a = agenteDeLaAutonomia(orden.agente)
  const estado = String(orden.estado)
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-[86px] shrink-0 whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{hora}</span>
      {a ? <OrbeDeAgente agente={a} tamano={22} quieto decorativo /> : <span className="h-[22px] w-[22px]" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm text-fg">{orden.procesoNombre || orden.proceso}</span>
        <span className="block truncate text-caption text-fg-subtle">
          {orden.agenteNombre}
          {orden.entidad?.nombre ? ` · ${orden.entidad.nombre}` : ''}
        </span>
      </span>
      <span
        className={unir(
          'shrink-0 rounded-full px-2 py-0.5 text-caption',
          estado === 'en_bandeja' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary',
        )}
      >
        {estado === 'en_bandeja' ? TEXTOS.director.estados.enBandeja : TEXTOS.director.estados.agente}
      </span>
    </div>
  )
}

function MetaEnTarjeta({ meta: m }: { meta: MetaDelDirector }) {
  const avance = avanceDeMeta(m)
  const unidad = String(m.unidad)
  return (
    <div className="space-y-2 rounded-md border border-border-faint p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-body-sm font-medium text-fg">
          <span className="line-clamp-1">{m.nombre}</span>
        </p>
        {m.estimada && <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-caption text-fg-muted">{TEXTOS.director.estimada}</span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="space-x-1.5">
          <span className="font-mono text-body-lg font-semibold tabular-nums text-fg">{valorDeMeta(m.actual, unidad)}</span>
          <span className="text-caption text-fg-muted">
            {TEXTOS.director.objetivo} {valorDeMeta(m.objetivo, unidad)}
          </span>
        </p>
        {m.serie.length >= 2 && (
          <span className="text-primary">
            <Sparkline values={m.serie.map((p) => p.valor)} width={84} height={26} area color="hsl(var(--primary))" aria-hidden="true" />
          </span>
        )}
      </div>
      {avance !== null && <BarraDeAvance valor={avance} etiqueta={`${m.nombre}: ${porcentaje(avance)} del camino al objetivo`} />}
    </div>
  )
}

// ── Los indicadores ────────────────────────────────────────────────────────

function Tile({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={cn(TARJETA, 'flex flex-col gap-3 p-4')}>
      <p className="flex items-center gap-2 text-fg-muted">
        {icono}
        <span className="font-mono text-label uppercase tracking-wide">{titulo}</span>
      </p>
      {children}
    </section>
  )
}

function Indicadores({ ind }: { ind: IndicadoresDelMando }) {
  const total = ind.flota ? ind.flota.porModo.sombra + ind.flota.porModo.copiloto + ind.flota.porModo.autonomo : 0
  return (
    <>
      <Tile titulo={TEXTOS.kpi.recuperado} icono={<Pulse weight="duotone" className="h-4 w-4" aria-hidden="true" />}>
        {ind.recuperado !== null ? (
          <Cifra valor={ind.recuperado} formato={pesos} className="text-[22px] font-semibold leading-tight text-fg" />
        ) : (
          <p className="text-body-sm text-fg-subtle">{TEXTOS.pieza.sinDato}</p>
        )}
        <p className="mt-auto text-caption text-fg-muted">{TEXTOS.kpi.recuperadoNota}</p>
      </Tile>

      <Tile titulo={TEXTOS.kpi.esperan} icono={<Tray weight="duotone" className="h-4 w-4" aria-hidden="true" />}>
        {ind.esperan !== null ? (
          <>
            <Cifra valor={ind.esperan} className="text-[28px] font-semibold leading-none text-fg" />
            <p className="mt-auto space-y-0.5 text-caption text-fg-muted">
              <span className="block">
                <span className="font-mono tabular-nums text-fg">{ind.altas ?? 0}</span> {TEXTOS.kpi.alta}
              </span>
              <span className={cn('block', (ind.atrasadas ?? 0) > 0 && 'text-danger')}>
                {ind.atrasadas ? (
                  TEXTOS.kpi.atrasadasN(ind.atrasadas)
                ) : (
                  TEXTOS.kpi.ningunaAtrasada
                )}
              </span>
            </p>
          </>
        ) : (
          <p className="text-body-sm text-fg-subtle">{TEXTOS.pieza.sinDato}</p>
        )}
      </Tile>

      <Tile titulo="Agentes en servicio" icono={<UsersThree weight="duotone" className="h-4 w-4" aria-hidden="true" />}>
        {ind.flota ? (
          <>
            <p className="flex items-baseline gap-1.5">
              <Cifra valor={ind.flota.actuan} className="text-[28px] font-semibold leading-none text-fg" />
              <span className="text-caption text-fg-muted">{TEXTOS.kpi.agentesDe(ind.flota.encendidos)}</span>
            </p>
            {total > 0 && (
              <div className="mt-auto space-y-1.5">
                <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                  <span className="bg-primary" style={{ flexGrow: ind.flota.porModo.autonomo }} />
                  <span className="bg-[color-mix(in_srgb,hsl(var(--primary))_40%,var(--surface))]" style={{ flexGrow: ind.flota.porModo.copiloto }} />
                  <span className="bg-border-strong" style={{ flexGrow: ind.flota.porModo.sombra }} />
                </div>
                <p className="text-caption text-fg-muted">
                  <span className="font-mono tabular-nums text-fg">{ind.flota.porModo.autonomo}</span> {TEXTOS.tripulacion.modos.autonomo} ·{' '}
                  <span className="font-mono tabular-nums text-fg">{ind.flota.porModo.copiloto}</span> {TEXTOS.tripulacion.modos.copiloto} ·{' '}
                  <span className="font-mono tabular-nums text-fg">{ind.flota.porModo.sombra}</span> {TEXTOS.tripulacion.modos.sombra}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-body-sm text-fg-subtle">{TEXTOS.pieza.sinDato}</p>
        )}
      </Tile>

      <TarjetaDeAlertas ind={ind} />
    </>
  )
}

/** Cuántas alertas hay y de qué severidad (del pulso, sin la de las decisiones: ésa es su propio KPI). */
export function TarjetaDeAlertas({ ind }: { ind: IndicadoresDelMando }) {
  const totalAlertas = ind.porSeveridad ? Object.values(ind.porSeveridad).reduce((s, n) => s + n, 0) : null
  return (
    <Tile titulo={TEXTOS.kpi.alertas} icono={<WarningCircle weight="duotone" className="h-4 w-4" aria-hidden="true" />}>
        {totalAlertas !== null && ind.porSeveridad ? (
          <>
            <Cifra valor={totalAlertas} className="text-[28px] font-semibold leading-none text-fg" />
            <ul className="mt-auto space-y-1">
              {SEVERIDADES.map(({ s, color }) => (
                <li key={s} className="flex items-center gap-2 text-caption text-fg-muted">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="flex-1">{TEXTOS.kpi.severidad[s]}</span>
                  <span className="font-mono tabular-nums text-fg">{ind.porSeveridad?.[s] ?? 0}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-body-sm text-fg-subtle">{TEXTOS.pieza.sinDato}</p>
        )}
    </Tile>
  )
}

// ── Lo del día ─────────────────────────────────────────────────────────────

function LoDelDia({ ind, datos }: { ind: IndicadoresDelMando; datos: PropsDeDireccion['datos'] }) {
  return (
    <div className="space-y-3">
      <MonoLabel>Hoy</MonoLabel>
      <EnPieza pieza={datos.pulso} queEs={TEXTOS.queEs.pulso} alto={60}>
        {() =>
          ind.hoy ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {(
                [
                  [TEXTOS.kpi.llamadas, ind.hoy.llamadas],
                  [TEXTOS.kpi.conversaciones, ind.hoy.conversaciones],
                  [TEXTOS.kpi.resueltas, ind.hoy.resueltas],
                  [TEXTOS.kpi.planeados, ind.hoy.planeados],
                  [TEXTOS.kpi.promesas, ind.hoy.promesas],
                ] as const
              )
                .filter(([, v]) => v !== null)
                .map(([k, v]) => (
                  <div key={k} className="flex min-w-0 flex-col">
                    <dt className="order-2 line-clamp-2 text-caption text-fg-muted">{k}</dt>
                    <dd className="order-1">
                      <Cifra valor={v as number} className="text-[22px] font-semibold leading-tight text-fg" />
                    </dd>
                  </div>
                ))}
            </dl>
          ) : null
        }
      </EnPieza>
    </div>
  )
}

// ── Lo urgente ─────────────────────────────────────────────────────────────

const ICONO_DE_SEVERIDAD = { critica: WarningOctagon, alta: WarningCircle, media: WarningCircle, info: Info } as const

export function LoUrgente({
  ind,
  datos,
  acciones,
  ahora,
  onAbrirBandeja,
}: {
  ind: IndicadoresDelMando
  datos: PropsDeDireccion['datos']
  acciones: PropsDeDireccion['acciones']
  ahora: number
  /** Abre la Bandeja entera (filtros, paginación y acciones, la de siempre). */
  onAbrirBandeja?: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <MonoLabel>{TEXTOS.bandeja.urgente}</MonoLabel>
        {onAbrirBandeja && <AbrirEnCajon texto={TEXTOS.bandeja.abrirTodo} onClick={onAbrirBandeja} />}
      </div>
      {ind.alertas.length > 0 && (
        <ul className="space-y-1" aria-label={TEXTOS.kpi.alertas}>
          {ind.alertas.slice(0, 3).map((a) => (
            <li key={a.id}>
              <FilaDeAlerta alerta={a} onAbrir={() => acciones.abrirAlerta(a)} />
            </li>
          ))}
        </ul>
      )}
      <EnPieza pieza={datos.bandeja} queEs={TEXTOS.queEs.bandeja}>
        {() =>
          ind.urgentes.length === 0 ? (
            <p className="py-2 text-body-sm text-fg-muted">{TEXTOS.bandeja.vacio}</p>
          ) : (
            <ul className="divide-y divide-border-faint">
              {ind.urgentes.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <FilaDeDecision item={item} onAbrir={acciones.abrirItem} ahora={ahora} />
                </li>
              ))}
            </ul>
          )
        }
      </EnPieza>
    </div>
  )
}

function FilaDeAlerta({ alerta, onAbrir }: { alerta: PulsoAlerta; onAbrir: () => void }) {
  const Icono = ICONO_DE_SEVERIDAD[alerta.severidad] ?? WarningCircle
  const tinta = alerta.severidad === 'media' ? 'text-warning' : alerta.severidad === 'info' ? 'text-info' : 'text-danger'
  const fondo = alerta.severidad === 'media' ? 'bg-warning-soft' : alerta.severidad === 'info' ? 'bg-info-soft' : 'bg-danger-soft'
  return (
    <Button variant="ghost" hideArrow onClick={onAbrir} className="h-auto w-full justify-start gap-3 rounded-md px-2 py-2 text-left font-normal">
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', fondo)} aria-hidden="true">
        <Icono weight="fill" className={cn('h-3.5 w-3.5', tinta)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium text-fg">{alerta.titulo}</span>
        <span className="block truncate text-caption text-fg-subtle">{alerta.detalle}</span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
    </Button>
  )
}

// ── En vivo ────────────────────────────────────────────────────────────────

export function EnVivo({
  ind,
  datos,
  acciones,
  onAbrirActividad,
}: {
  ind: IndicadoresDelMando
  datos: PropsDeDireccion['datos']
  acciones: PropsDeDireccion['acciones']
  /** Abre la actividad completa, por día (la de siempre). */
  onAbrirActividad?: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2">
          <PuntoDeEstado estado={ind.estado === 'apagado' ? 'apagado' : 'ok'} late={ind.enCurso.length > 0} />
          <MonoLabel>{TEXTOS.enVivo.titulo}</MonoLabel>
        </p>
        {onAbrirActividad && <AbrirEnCajon texto="Ver toda la actividad" onClick={onAbrirActividad} />}
      </div>
      {ind.enCurso.length > 0 && (
        <ul className="space-y-1.5" aria-label={TEXTOS.enVivo.ahora}>
          {ind.enCurso.slice(0, 3).map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-md bg-primary-soft px-3 py-2">
              <span className="font-mono text-label uppercase tracking-wide text-primary">{TEXTOS.enVivo.ahora}</span>
              <span className="min-w-0 flex-1 truncate text-body-sm text-fg">{e.titulo}</span>
              {e.desde && <span className="shrink-0 font-mono text-caption tabular-nums text-fg-muted">{relativeTime(e.desde, t)}</span>}
            </li>
          ))}
        </ul>
      )}
      <EnPieza pieza={datos.actividad} queEs={TEXTOS.queEs.actividad}>
        {(items) =>
          items.length === 0 ? (
            <p className="text-body-sm text-fg-muted">{TEXTOS.enVivo.sinActividad}</p>
          ) : (
            <div className="max-h-[360px] overflow-y-auto pr-1" data-lenis-prevent>
              <ListaEnVivo items={items} maximo={12} onAbrir={acciones.abrirItem} />
            </div>
          )
        }
      </EnPieza>
    </div>
  )
}

// ── La tripulación ─────────────────────────────────────────────────────────

export function Tripulacion({
  ind,
  datos,
  acciones,
}: {
  ind: IndicadoresDelMando
  datos: PropsDeDireccion['datos']
  /** Con `acciones.agentes`, el popover de cada agente trae Activar / Desactivar y su modo. */
  acciones?: PropsDeDireccion['acciones']
}) {
  // Cuántas acciones lleva hoy cada uno (del feed, sin lo que hicieron las personas). Sin feed: sin dato.
  const hoyPorAgente = ind.solosHoy ? new Map(ind.solosHoy.porAgente.map((s) => [s.agente, s.n])) : null
  // UN solo panel abierto a la vez (Nico, 21:48: salían dos apilados).
  const [abierto, setAbierto] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <MonoLabel>{TEXTOS.tripulacion.titulo}</MonoLabel>
        <p className="text-caption text-fg-muted">{TEXTOS.tripulacion.bajada}</p>
      </div>
      <EnPieza pieza={datos.flota} queEs={TEXTOS.queEs.flota} alto={180}>
        {() => (
          // `auto-rows-fr`: todas las filas de la misma altura (también las apagadas y las que todavía no actúan).
          <Stagger as="ul" className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="tripulacion">
            {ind.tripulacion.map((m) => (
              <StaggerItem key={m.agente} as="li" className="h-full">
                <TripulanteConPopover
                  m={m}
                  pilotoEncendido={ind.activo === true}
                  accionesHoy={hoyPorAgente ? (hoyPorAgente.get(m.agente) ?? 0) : null}
                  {...(acciones?.agentes ? { control: acciones.agentes } : {})}
                  abierto={abierto === m.agente}
                  onAbiertoChange={(o) => setAbierto((actual) => (o ? m.agente : actual === m.agente ? null : actual))}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </EnPieza>
    </div>
  )
}
