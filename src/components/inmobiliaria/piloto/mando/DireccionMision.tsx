'use client'

/**
 * Dirección C · MISIÓN DEL DÍA — el día como una misión.
 *
 *   · Arriba, la misión: el objetivo de hoy (el del director; sin director,
 *     dejar la Bandeja en cero) con su avance, y el orbe del piloto automático
 *     en la esquina, reaccionando al estado.
 *   · La cinta de indicadores: cifras que cuentan hasta su valor.
 *   · La línea de hoy, hora por hora: lo que corrió, lo que corre y lo que
 *     viene, cada cosa como un punto vivo (`LineaDelDia`).
 *   · Abajo: lo que viene, lo que te necesita y lo que corrió.
 *
 * Cada número una vez:
 *   · avance de la misión → órdenes hechas / vivas (director), o resueltas hoy
 *     sobre resueltas + esperan (pulso + Bandeja) sin director;
 *   · cinta → recuperado del mes (briefing), esperan (Bandeja; altas y
 *     atrasadas debajo), llamadas hoy (pulso), acuerdos hoy (briefing),
 *     agentes en servicio (flota) y alertas por severidad (pulso).
 */

import { useMemo } from 'react'
import { CalendarCheck, Flag, Power } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { MonoLabel, Stagger, StaggerItem, motionDistance, motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import { agenteDeLaAutonomia } from '@/lib/agentes/equipo'
import type { PulsoSeveridad } from '@/lib/api/piloto'
import { cn } from '@/lib/utils'

import { eventosDeHoy, fechaDeHoy, horaCorta, type EventoDelDia } from './calculos'
import { indicadoresDelMando, type IndicadoresDelMando } from './indicadores'
import { LineaDelDia } from './LineaDelDia'
import { BarraDeAvance, Cifra, EnPieza, FilaDeDecision, ListaEnVivo, OrbeDelPiloto, PuntoDeEstado, Reloj, pesos, useAhora, useNombreDeAgente } from './piezas'
import { TEXTOS } from './textos'
import type { PropsDeDireccion } from './tipos'
import { Voz } from './voz'

const TARJETA = 'min-w-0 rounded-lg border border-border bg-surface shadow-sm'

const SEVERIDADES: Array<{ s: PulsoSeveridad; color: string }> = [
  { s: 'critica', color: 'var(--danger)' },
  { s: 'alta', color: 'var(--danger)' },
  { s: 'media', color: 'var(--warning)' },
  { s: 'info', color: 'var(--info)' },
]

/** La primera oración (el objetivo cabe en una línea; el resto va debajo). */
function partirEnOraciones(texto: string): [string, string | null] {
  const m = /^([^]+?[a-záéíóúñ0-9)]{2}[.!?])\s+([A-ZÁÉÍÓÚÑ¿¡][^]*)$/.exec(texto.trim())
  return m ? [m[1] as string, m[2] as string] : [texto.trim(), null]
}

export function DireccionMision({ datos, acciones, activacion }: PropsDeDireccion) {
  const ahora = useAhora(30_000)
  const ind = indicadoresDelMando(datos, ahora)
  const eventos = useMemo(
    () => eventosDeHoy({ actividad: ind.actividad, pulso: datos.pulso.data, hoy: ind.director, ahora }),
    [ind.actividad, datos.pulso.data, ind.director, ahora],
  )
  const todos = useMemo(() => [...eventos.conHora, ...eventos.sinHora], [eventos])

  return (
    <div className="space-y-4" data-testid="mando-mision">
      <Stagger className="space-y-4">
        <StaggerItem key="mision" className={cn(TARJETA, 'relative overflow-hidden')}>
          <Mision ind={ind} ahora={ahora} conActivacion={Boolean(activacion)} />
        </StaggerItem>

        <StaggerItem key="cinta" className={TARJETA}>
          <Cinta ind={ind} />
        </StaggerItem>

        <StaggerItem key="linea" className={cn(TARJETA, 'p-5 sm:p-6')}>
          <HoyHoraPorHora eventos={eventos} pieza={datos.actividad} ahora={ahora} onAbrir={(id) => acciones.abrirItem(id)} />
        </StaggerItem>

        <StaggerItem key="abajo" className="grid min-w-0 gap-4 lg:grid-cols-3">
          <section className={cn(TARJETA, 'p-5')} aria-labelledby="mision-viene">
            <h3 id="mision-viene" className="mb-3">
              <MonoLabel>{TEXTOS.mision.loQueViene}</MonoLabel>
            </h3>
            <LoQueViene eventos={todos.filter((e) => e.momento !== 'corrio')} />
          </section>
          <section className={cn(TARJETA, 'p-5')} aria-labelledby="mision-necesitan">
            <h3 id="mision-necesitan" className="mb-1">
              <MonoLabel>{TEXTOS.bandeja.titulo}</MonoLabel>
            </h3>
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
          </section>
          <section className={cn(TARJETA, 'p-5')} aria-labelledby="mision-corrio">
            <h3 id="mision-corrio" className="mb-2">
              <MonoLabel>Lo que corrió</MonoLabel>
            </h3>
            <EnPieza pieza={datos.actividad} queEs={TEXTOS.queEs.actividad}>
              {(items) =>
                items.length === 0 ? (
                  <p className="text-body-sm text-fg-muted">{TEXTOS.enVivo.sinActividad}</p>
                ) : (
                  <ListaEnVivo items={items} maximo={6} onAbrir={acciones.abrirItem} compacta />
                )
              }
            </EnPieza>
          </section>
        </StaggerItem>
      </Stagger>

      {activacion}
    </div>
  )
}

/**
 * «Hoy, hora por hora»: la línea del día con su leyenda y lo que es de hoy
 * sin hora fija. La usan la Misión (C) y la pantalla elegida (debajo del núcleo).
 */
export function HoyHoraPorHora({
  eventos,
  pieza,
  ahora,
  onAbrir,
}: {
  eventos: { conHora: EventoDelDia[]; sinHora: EventoDelDia[] }
  pieza: PropsDeDireccion['datos']['actividad']
  ahora: number
  onAbrir: (id: string) => void
}) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <CalendarCheck weight="duotone" className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          <MonoLabel>{TEXTOS.mision.linea}</MonoLabel>
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-fg-muted" aria-label="Qué es cada punto">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
            {TEXTOS.mision.corrio}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-success" />
            {TEXTOS.mision.corre}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-primary bg-surface" />
            {TEXTOS.mision.viene}
          </li>
        </ul>
      </div>
      <EnPieza pieza={pieza} queEs={TEXTOS.queEs.actividad} alto={140}>
        {() => (
          <>
            <LineaDelDia eventos={eventos.conHora} ahora={ahora} onAbrir={onAbrir} />
            {eventos.conHora.length === 0 && (
              <p className="mt-2 text-center text-body-sm text-fg-muted">Hoy todavía no corrió nada. Lo que hagan los agentes aparece aquí, en su hora.</p>
            )}
            {eventos.sinHora.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-label uppercase tracking-wide text-fg-muted">{TEXTOS.mision.sinHora}</span>
                {eventos.sinHora.map((e) => (
                  <span key={e.id} className="rounded-full border border-dashed border-primary px-2.5 py-1 text-caption text-fg">
                    {e.titulo}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </EnPieza>
    </>
  )
}

// ── La misión ──────────────────────────────────────────────────────────────

function Mision({ ind, ahora, conActivacion }: { ind: IndicadoresDelMando; ahora: number; conActivacion: boolean }) {
  const apagado = ind.estado === 'apagado'
  const conDirector = ind.voz?.quien === 'director' && ind.plan !== null
  const [objetivo, resto] = conDirector && ind.voz ? partirEnOraciones(ind.voz.texto) : [TEXTOS.mision.objetivoSinDirector, null]
  const resueltas = ind.hoy?.resueltas ?? null
  const avance = conDirector
    ? (ind.plan?.avance ?? 0)
    : ind.esperan !== null && resueltas !== null && resueltas + ind.esperan > 0
      ? resueltas / (resueltas + ind.esperan)
      : null
  const textoDelAvance = conDirector
    ? `${ind.plan?.hechas ?? 0} de ${(ind.plan?.total ?? 0) - (ind.plan?.fuera ?? 0)} órdenes del plan hechas`
    : resueltas !== null && ind.esperan !== null
      ? `${resueltas} de ${resueltas + ind.esperan} decisiones resueltas hoy`
      : null

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-7 md:flex-row md:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Flag weight="duotone" className="h-4 w-4 text-primary" aria-hidden="true" />
          <MonoLabel>
            {TEXTOS.mision.titulo} · {fechaDeHoy(new Date(ahora))}
          </MonoLabel>
          <Reloj />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-label uppercase tracking-wide text-fg-muted">
            {apagado ? TEXTOS.voz.apagado : conDirector ? TEXTOS.voz.director(ind.voz?.desde ? horaCorta(new Date(ind.voz.desde)) : null) : TEXTOS.mision.objetivo}
          </p>
          <Voz como="h2" texto={objetivo} className="max-w-3xl text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[30px]" />
          {resto && <p className="max-w-3xl text-body-sm text-fg-muted">{resto}</p>}
          {!conDirector && !apagado && <p className="max-w-3xl text-body-sm text-fg-muted">{TEXTOS.mision.objetivoSinDirectorNota}</p>}
          {apagado && <p className="max-w-3xl text-body-sm text-fg-muted">{ind.fraseDelPiloto ?? TEXTOS.voz.apagadoBajada}</p>}
        </div>
        {avance !== null && textoDelAvance && (
          <div className="max-w-xl space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm text-fg-muted">{textoDelAvance}</span>
              <Cifra valor={Math.round(avance * 100)} formato={(v) => `${Math.round(v)} %`} className="text-h2 font-semibold text-fg" />
            </div>
            <BarraDeAvance valor={avance} etiqueta={textoDelAvance} className="h-2" />
          </div>
        )}
        {apagado && conActivacion && ind.sePuedeEncender && (
          <Button asChild size="sm" hideArrow>
            <a href="#piloto-activacion">
              <Power weight="bold" className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {TEXTOS.activar.invitacion}
            </a>
          </Button>
        )}
      </div>
      <div className="order-first flex shrink-0 items-center gap-3 self-start md:order-none md:flex-col md:items-center md:gap-2">
        <OrbeDelPiloto estado={ind.estado} orbe={ind.orbe} tamano={88} />
        <span className="inline-flex items-center gap-2">
          <PuntoDeEstado estado={ind.estado} late={ind.enCurso.length > 0} />
          <span className="font-mono text-label uppercase tracking-wide text-fg-muted">{TEXTOS.estado[ind.estado]}</span>
        </span>
      </div>
    </div>
  )
}

// ── La cinta de indicadores ────────────────────────────────────────────────

function Cinta({ ind }: { ind: IndicadoresDelMando }) {
  const totalAlertas = ind.porSeveridad ? Object.values(ind.porSeveridad).reduce((s, n) => s + n, 0) : null
  const items: Array<{ k: string; etiqueta: string; valor: number | null; formato?: (v: number) => string; nota?: React.ReactNode }> = [
    { k: 'recuperado', etiqueta: TEXTOS.kpi.recuperado, valor: ind.recuperado, formato: pesos },
    {
      k: 'esperan',
      etiqueta: TEXTOS.kpi.esperan,
      valor: ind.esperan,
      nota:
        ind.esperan !== null ? (
          <>
            {TEXTOS.kpi.altasN(ind.altas ?? 0)}
            {ind.atrasadas ? <span className="text-danger">{` · ${TEXTOS.kpi.atrasadasN(ind.atrasadas)}`}</span> : null}
          </>
        ) : undefined,
    },
    { k: 'llamadas', etiqueta: TEXTOS.kpi.llamadas, valor: ind.hoy?.llamadas ?? null },
    { k: 'acuerdos', etiqueta: TEXTOS.kpi.promesas, valor: ind.hoy?.promesas ?? null },
    {
      k: 'agentes',
      etiqueta: 'Agentes en servicio',
      valor: ind.flota?.actuan ?? null,
      ...(ind.flota ? { nota: TEXTOS.kpi.agentesDe(ind.flota.encendidos) } : {}),
    },
    {
      k: 'alertas',
      etiqueta: TEXTOS.kpi.alertas,
      valor: totalAlertas,
      nota: ind.porSeveridad ? (
        <span className="inline-flex flex-wrap gap-x-2">
          {SEVERIDADES.filter(({ s }) => (ind.porSeveridad?.[s] ?? 0) > 0).map(({ s, color }) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              {`${ind.porSeveridad?.[s]} ${TEXTOS.kpi.severidadN(s, ind.porSeveridad?.[s] ?? 0)}`}
            </span>
          ))}
        </span>
      ) : undefined,
    },
  ]
  return (
    <dl className="grid grid-cols-2 divide-border-faint sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
      {items.map((it, i) => (
        <div
          key={it.k}
          className={cn(
            'flex min-w-0 flex-col gap-1 px-5 py-4',
            // Las líneas entre celdas en el teléfono: abajo y, a la derecha, en la columna par.
            'border-border-faint max-lg:border-b',
            i % 2 === 0 && 'max-sm:border-r',
          )}
        >
          <dt className="truncate font-mono text-label uppercase tracking-wide text-fg-muted">{it.etiqueta}</dt>
          <dd className="space-y-0.5">
            {it.valor !== null ? (
              <Cifra valor={it.valor} {...(it.formato ? { formato: it.formato } : {})} className={cn('block font-semibold leading-tight text-fg', it.k === 'recuperado' ? 'text-xl' : 'text-[28px]')} />
            ) : (
              <span className="block text-body-sm text-fg-subtle">{TEXTOS.pieza.sinDato}</span>
            )}
            {it.nota && <span className="block text-caption text-fg-muted">{it.nota}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ── Lo que viene ───────────────────────────────────────────────────────────

function LoQueViene({ eventos }: { eventos: EventoDelDia[] }) {
  const nombre = useNombreDeAgente()
  const reducido = usePrefersReducedMotion()
  if (eventos.length === 0) return <p className="text-body-sm text-fg-muted">{TEXTOS.mision.nadaViene}</p>
  return (
    <ol className="space-y-3">
      {eventos.slice(0, 6).map((e, i) => {
        const a = e.agente ? agenteDeLaAutonomia(e.agente) : null
        return (
          <motion.li
            key={e.id}
            className="flex items-start gap-3"
            initial={reducido ? false : { opacity: 0, x: -motionDistance.sm }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.05, duration: motionDuration.base, ease: motionEase.enter }}
          >
            <span className="w-[86px] shrink-0 whitespace-nowrap pt-0.5 font-mono text-caption tabular-nums text-fg-muted">
              {e.momento === 'corre' ? TEXTOS.mision.ahora : e.at ? horaCorta(e.at) : 'Hoy'}
            </span>
            {a ? <OrbeDeAgente agente={a} tamano={22} estado={e.momento === 'corre' ? 'trabajando' : 'quieto'} quieto={e.momento !== 'corre'} decorativo /> : <span className="h-[22px] w-[22px] shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm text-fg">{e.titulo}</span>
              <span className="block truncate text-caption text-fg-subtle">
                {e.agente ? nombre(e.agente) : ''}
                {e.detalle ? ` · ${e.detalle}` : ''}
              </span>
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}
