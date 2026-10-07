'use client'

/**
 * La línea de HOY (dirección C): lo que corrió, lo que corre y lo que viene,
 * cada cosa como un punto vivo sobre las horas del día de Colombia.
 *
 *   · Desde `md`: horizontal, de las 6 a. m. a las 8 p. m. (se estira si hay
 *     algo antes o después). Lo que ya pasó queda sombreado hasta la aguja de
 *     «Ahora», que avanza sola. Los puntos que caerían encima de otro suben o
 *     bajan de carril.
 *   · En el teléfono: vertical, por hora (se reacomoda, no se encoge).
 *
 * Movimiento: los puntos entran escalonados (escala + fundido, techo de 320 ms);
 * los que llegan después entran solos; lo que corre late (anillo que se abre,
 * `opacity` + `scale`). Con movimiento reducido: todo quieto.
 *
 * Cada punto es un botón: con el foco o el puntero dice qué es; con un clic
 * abre el MISMO cajón de la torre (si el caso se puede abrir).
 */

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { motionDuration, motionEase, motionStagger, usePrefersReducedMotion } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { horaCorta, minutosDelDia, posicionEnLaLinea, tramoDeLaLinea, type EventoDelDia } from './calculos'
import { useBucleVivo, useNombreDeAgente } from './piezas'
import { TEXTOS } from './textos'

const ETIQUETA_DEL_MOMENTO = { corrio: TEXTOS.mision.corrio, corre: TEXTOS.mision.corre, viene: TEXTOS.mision.viene } as const

/** Distancia mínima (en % del ancho) entre dos puntos del mismo carril. */
const SEPARACION = 2.6
/** Carriles: 0 en el eje, después arriba/abajo alternando. */
const CARRILES = [0, -1, 1, -2, 2, -3, 3]
const ALTO_DEL_CARRIL = 22

interface Punto {
  ev: EventoDelDia
  x: number
  carril: number
}

function enCarriles(eventos: readonly EventoDelDia[], tramo: { desde: number; hasta: number }): Punto[] {
  const ultimo = new Map<number, number>()
  return eventos
    .filter((e) => e.at)
    .map((ev) => {
      const x = posicionEnLaLinea(ev.at as Date, tramo)
      const carril = CARRILES.find((c) => (ultimo.get(c) ?? -Infinity) <= x - SEPARACION) ?? 0
      ultimo.set(carril, x)
      return { ev, x, carril }
    })
}

export function LineaDelDia({
  eventos,
  ahora,
  onAbrir,
}: {
  eventos: readonly EventoDelDia[]
  ahora: number
  onAbrir: (id: string) => void
}) {
  const tramo = useMemo(() => tramoDeLaLinea(eventos, ahora), [eventos, ahora])
  const puntos = useMemo(() => enCarriles(eventos, tramo), [eventos, tramo])
  return (
    <>
      <div className="hidden md:block">
        <Horizontal puntos={puntos} tramo={tramo} ahora={ahora} onAbrir={onAbrir} />
      </div>
      <div className="md:hidden">
        <Vertical eventos={eventos} ahora={ahora} onAbrir={onAbrir} />
      </div>
    </>
  )
}

function Horizontal({
  puntos,
  tramo,
  ahora,
  onAbrir,
}: {
  puntos: Punto[]
  tramo: { desde: number; hasta: number }
  ahora: number
  onAbrir: (id: string) => void
}) {
  const reducido = usePrefersReducedMotion()
  const { ref, vivo } = useBucleVivo<HTMLDivElement>()
  const nombre = useNombreDeAgente()
  const [foco, setFoco] = useState<string | null>(null)
  const xAhora = posicionEnLaLinea(new Date(ahora), tramo)
  const carrilesUsados = Math.max(1, ...puntos.map((p) => Math.abs(p.carril)))
  const alto = Math.max(140, 72 + carrilesUsados * 2 * ALTO_DEL_CARRIL)
  const horas: number[] = []
  for (let m = tramo.desde; m <= tramo.hasta; m += 60) horas.push(m)
  const cadaCuanto = horas.length > 12 ? 2 : 1

  // Lo que había al montar entra escalonado; lo que llega después entra solo.
  const iniciales = useRef<Map<string, number> | null>(null)
  if (iniciales.current === null) iniciales.current = new Map(puntos.map((p, i) => [p.ev.id, i]))
  const paso = Math.min(motionStagger.step, motionStagger.max / Math.max(1, puntos.length))

  const enFoco = puntos.find((p) => p.ev.id === foco) ?? null

  return (
    <div ref={ref} className="relative select-none" style={{ height: alto + 28 }} onMouseLeave={() => setFoco(null)}>
      <div className="absolute inset-x-0 top-0" style={{ height: alto }}>
        {/* Lo que ya pasó del día, sombreado hasta «ahora». Crece con scaleX. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full origin-left rounded-md bg-primary-soft"
          initial={reducido ? false : { scaleX: 0 }}
          animate={{ scaleX: xAhora / 100 }}
          transition={{ duration: motionDuration.reveal * 2, ease: motionEase.enter }}
        />
        {/* El eje y las horas. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border" />
        {horas.map((m) => (
          <div key={m} aria-hidden="true" className="absolute top-0 h-full" style={{ left: `${((m - tramo.desde) / (tramo.hasta - tramo.desde)) * 100}%` }}>
            <div className="h-full w-px bg-border-faint" />
          </div>
        ))}
        {/* La aguja de «ahora». */}
        <div aria-hidden="true" className="absolute top-0 h-full" style={{ left: `${xAhora}%` }}>
          <div className="absolute -top-0.5 left-0 h-[calc(100%+4px)] w-0.5 -translate-x-1/2 rounded-full bg-primary" />
          <span className="absolute -top-6 left-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 font-mono text-label uppercase tracking-wide text-primary-fg">
            {TEXTOS.mision.ahora}
          </span>
        </div>

        {/* Los puntos. */}
        {puntos.map((p) => {
          const indice = iniciales.current?.get(p.ev.id)
          const y = alto / 2 + p.carril * ALTO_DEL_CARRIL
          const etiqueta = `${horaCorta(p.ev.at as Date)} · ${ETIQUETA_DEL_MOMENTO[p.ev.momento]}: ${p.ev.titulo}${p.ev.agente ? ` (${nombre(p.ev.agente)})` : ''}`
          return (
            <motion.button
              key={p.ev.id}
              type="button"
              aria-label={etiqueta}
              aria-disabled={p.ev.abrir ? undefined : true}
              onClick={() => p.ev.abrir && onAbrir(p.ev.abrir)}
              onFocus={() => setFoco(p.ev.id)}
              onBlur={() => setFoco((f) => (f === p.ev.id ? null : f))}
              onMouseEnter={() => setFoco(p.ev.id)}
              className={cn(
                'absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full',
                p.ev.abrir ? 'cursor-pointer' : 'cursor-default',
              )}
              style={{ left: `${p.x}%`, top: y }}
              initial={reducido ? false : { opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: indice !== undefined ? 0.2 + indice * paso : 0, duration: motionDuration.base, ease: motionEase.enter }}
            >
              <Marca momento={p.ev.momento} vivo={vivo} />
            </motion.button>
          )
        })}

        {/* Lo que dice el punto con el foco o el puntero. */}
        {enFoco && (
          <motion.div
            key={enFoco.ev.id}
            role="tooltip"
            className="pointer-events-none absolute z-10 w-64 rounded-md border border-border bg-surface p-3 shadow-md"
            style={{
              left: `clamp(0px, calc(${enFoco.x}% - 128px), calc(100% - 256px))`,
              top: alto / 2 + enFoco.carril * ALTO_DEL_CARRIL + (enFoco.carril > 0 ? -104 : 16),
            }}
            initial={reducido ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.fast, ease: motionEase.enter }}
          >
            <p className="font-mono text-label uppercase tracking-wide text-fg-muted">
              {horaCorta(enFoco.ev.at as Date)} · {ETIQUETA_DEL_MOMENTO[enFoco.ev.momento]}
            </p>
            <p className="mt-1 line-clamp-2 text-body-sm text-fg">{enFoco.ev.titulo}</p>
            {enFoco.ev.agente && <p className="mt-0.5 text-caption text-fg-subtle">{nombre(enFoco.ev.agente)}</p>}
          </motion.div>
        )}
      </div>

      {/* Las horas. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-5">
        {horas.map((m, i) =>
          i % cadaCuanto === 0 ? (
            <span
              key={m}
              className={cn('absolute whitespace-nowrap font-mono text-caption tabular-nums text-fg-subtle', i === 0 ? '' : m >= tramo.hasta ? '-translate-x-full' : '-translate-x-1/2')}
              style={{ left: `${((m - tramo.desde) / (tramo.hasta - tramo.desde)) * 100}%` }}
            >
              {horaDelEje(m)}
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}

function horaDelEje(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

/** El punto: lleno lo que corrió, con anillo vivo lo que corre, hueco lo que viene. */
function Marca({ momento, vivo }: { momento: EventoDelDia['momento']; vivo: boolean }) {
  if (momento === 'viene') {
    return <span className="block h-3 w-3 rounded-full border-2 border-primary bg-surface" />
  }
  if (momento === 'corre') {
    return (
      <span className="relative grid h-3.5 w-3.5 place-items-center">
        {vivo && (
          <motion.span
            className="absolute inset-0 rounded-full bg-success"
            animate={{ opacity: [0.55, 0], scale: [1, 2.6] }}
            transition={{ duration: motionDuration.ambient * 0.75, repeat: Infinity, ease: motionEase.exit }}
          />
        )}
        <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
      </span>
    )
  }
  return <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
}

function Vertical({ eventos, ahora, onAbrir }: { eventos: readonly EventoDelDia[]; ahora: number; onAbrir: (id: string) => void }) {
  const nombre = useNombreDeAgente()
  const { ref, vivo } = useBucleVivo<HTMLOListElement>()
  const horaAhora = Math.floor(minutosDelDia(new Date(ahora)) / 60)
  const porHora = new Map<number, EventoDelDia[]>()
  for (const e of eventos) {
    if (!e.at) continue
    const h = Math.floor(minutosDelDia(e.at) / 60)
    porHora.set(h, [...(porHora.get(h) ?? []), e])
  }
  if (!porHora.has(horaAhora)) porHora.set(horaAhora, [])
  const horas = [...porHora.keys()].sort((a, b) => a - b)
  return (
    <ol ref={ref} className="relative space-y-4 border-l border-border pl-5">
      {horas.map((h) => (
        <li key={h} className="relative">
          <span
            aria-hidden="true"
            className={cn('absolute -left-[25px] top-1 h-2 w-2 rounded-full', h === horaAhora ? 'bg-primary' : 'bg-border-strong')}
          />
          <p className="mb-1.5 flex items-center gap-2 font-mono text-label uppercase tracking-wide text-fg-muted">
            {horaDelEje(h * 60)}
            {h === horaAhora && <span className="rounded-full bg-primary px-2 py-0.5 text-primary-fg">{TEXTOS.mision.ahora}</span>}
          </p>
          <ul className="space-y-1">
            {(porHora.get(h) ?? []).map((e) => (
              <li key={e.id}>
                <Button
                  variant="ghost"
                  hideArrow
                  onClick={() => e.abrir && onAbrir(e.abrir)}
                  aria-disabled={e.abrir ? undefined : true}
                  className="h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-md px-1 py-1.5 text-left font-normal"
                >
                  <span className="mt-1.5 shrink-0">
                    <Marca momento={e.momento} vivo={vivo} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm text-fg">{e.titulo}</span>
                    <span className="block text-caption text-fg-subtle">
                      {horaCorta(e.at as Date)} · {ETIQUETA_DEL_MOMENTO[e.momento]}
                      {e.agente ? ` · ${nombre(e.agente)}` : ''}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
