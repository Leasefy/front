'use client'

/**
 * Las piezas que comparten las tres direcciones del centro de mando: el orbe
 * del piloto automático, las cifras que cuentan, los medidores, las barras de
 * avance, la lista en vivo, las filas de la Bandeja y los estados de cada
 * pieza (cargando / falló / no disponible).
 *
 * Movimiento (`docs/DESIGN.md` §8b, Nico 02-10): todo con los tokens de
 * Cadence, sólo `transform` y `opacity`. Los bucles decorativos (el halo que
 * respira, el anillo que gira) usan `motionDuration.ambient`, se pausan fuera
 * de pantalla y no existen con movimiento reducido. El orbe lo pinta el motor
 * de Cadence, que ya pausa lo que no se ve y la pestaña oculta.
 *
 * Dos tonos: `superficie` (las tarjetas del panel, claro y oscuro) y `tinta`
 * (la superficie de marca oscura `bg-ink`, la misma en los dos temas).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { Tray, UsersThree } from '@phosphor-icons/react'
import {
  AnimatedNumber,
  motionDistance,
  motionDuration,
  motionEase,
  usePrefersReducedMotion,
} from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import { agenteDeLaAutonomia, nombreDelAgente } from '@/lib/agentes/equipo'
import type { EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { formatCurrency } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { ActivityItem, InboxItem } from '@/lib/api/piloto'
import { cn } from '@/lib/utils'

import { DEL_EQUIPO, horaCorta, type EstadoDelMando } from './calculos'
import { TEXTOS } from './textos'
import type { Pieza } from './tipos'

export type Tono = 'superficie' | 'tinta'

/**
 * Junta clases SIN pasar por tailwind-merge. `cn` cree que `text-label`,
 * `text-caption` y `text-body-sm` (tamaños propios del preset) son COLORES y
 * los borra al lado de `text-ink-fg-muted`: el rótulo quedaba en 16 px
 * (medido en las capturas del 05-10). Aquí no hay nada que fusionar.
 */
export function unir(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}

/** Las clases de texto y borde de cada tono. Tokens: nada de colores sueltos. */
export const TONO = {
  superficie: { fg: 'text-fg', muted: 'text-fg-muted', subtle: 'text-fg-subtle', borde: 'border-border', bordeSuave: 'border-border-faint' },
  // Sobre la tinta, lo «tenue» es el muted: el subtle (45 %) da 4,2–4,5:1 y con el resplandor cobalto baja de AA.
  tinta: { fg: 'text-ink-fg', muted: 'text-ink-fg-muted', subtle: 'text-ink-fg-muted', borde: 'border-ink-border', bordeSuave: 'border-ink-border' },
} as const

/** El color de cada estado (para puntos, halos y anillos; nunca para texto sobre tinta). */
export const COLOR_DEL_ESTADO: Record<EstadoDelMando, string> = {
  ok: 'var(--success)',
  atencion: 'var(--warning)',
  critico: 'var(--danger)',
  desconocido: 'var(--fg-subtle)',
  apagado: 'transparent',
}

/** El acento de los medidores sobre la tinta: el cobalto, aclarado para leerse en lo oscuro. */
export const ACENTO_EN_TINTA = 'color-mix(in srgb, hsl(var(--primary)) 72%, var(--ink-fg))'

// ── Hooks chicos ───────────────────────────────────────────────────────────

/** Un reloj que se mueve cada `cadaMs` (la aguja de «ahora», los «hace 3 min»). */
export function useAhora(cadaMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), cadaMs)
    return () => clearInterval(id)
  }, [cadaMs])
  return ahora
}

/** ¿Se puede animar un bucle aquí? (en pantalla y sin movimiento reducido). */
export function useBucleVivo<T extends Element>(): { ref: React.RefObject<T | null>; vivo: boolean } {
  const ref = useRef<T | null>(null)
  const enPantalla = useInView(ref, { margin: '120px' })
  const reducido = usePrefersReducedMotion()
  return { ref, vivo: enPantalla && !reducido }
}

/** El nombre de un agente de la flota (o «Tu equipo» para las acciones de las personas). */
export function useNombreDeAgente(): (id: string | null | undefined) => string {
  const { t } = useI18n()
  return (id) => {
    if (!id) return ''
    if (id === DEL_EQUIPO) return TEXTOS.enVivo.tuEquipo
    const a = agenteDeLaAutonomia(id)
    if (a) return nombreDelAgente(a, t)
    return id.charAt(0).toUpperCase() + id.slice(1)
  }
}

// ── El orbe del piloto automático ──────────────────────────────────────────

export interface OrbeDelPilotoProps {
  estado: EstadoDelMando
  orbe: EstadoDelOrbe
  tamano: number
  /** Anillos que giran alrededor (el núcleo de la dirección A). */
  conAnillos?: boolean
  /**
   * Con el puntero o el foco encima (Nico, 05-10 19:30: «que reaccione, que
   * haga algo»): los anillos se abren, el halo sube y se queda quieto arriba.
   * Sólo `transform` y `opacity`; con movimiento reducido, sólo el halo.
   */
  despierto?: boolean
  tono?: Tono
  className?: string
}

/**
 * El orbe del piloto automático: el del orquestador con la Nebulosa de Cadence
 * TAL CUAL (elección de Nico, v1.2.2; `memory/elegida-tal-cual.md`), con un
 * halo del color del estado que respira y, si se pide, dos anillos que giran.
 * El halo y los anillos van POR FUERA del orbe: el orbe no se toca.
 */
export function OrbeDelPiloto({ estado, orbe, tamano, conAnillos = false, despierto = false, tono = 'superficie', className }: OrbeDelPilotoProps) {
  const { ref, vivo } = useBucleVivo<HTMLDivElement>()
  const reducido = usePrefersReducedMotion()
  const lado = Math.round(tamano * (conAnillos ? 1.7 : 1.35))
  // Apagado y despierto: un halo neutro (se nota que reaccionó, sin fingir un estado).
  const color = estado === 'apagado' ? 'var(--fg-subtle)' : COLOR_DEL_ESTADO[estado]
  const borde = tono === 'tinta' ? 'border-ink-border' : 'border-border'
  const abrir = (cuanto: number) => (despierto && !reducido ? { scale: cuanto } : { scale: 1 })
  const resorte = { duration: motionDuration.slow, ease: motionEase.emphasis }
  return (
    <div
      ref={ref}
      className={cn('relative grid shrink-0 place-items-center', className)}
      style={{ width: lado, height: lado }}
      role="img"
      aria-label={`Piloto automático: ${TEXTOS.estado[estado].toLocaleLowerCase('es')}`}
      data-estado={estado}
      data-despierto={despierto || undefined}
    >
      {(estado !== 'apagado' || despierto) && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, color-mix(in srgb, ${color} ${despierto ? 48 : 34}%, transparent) 0%, transparent 64%)` }}
          initial={false}
          animate={
            despierto
              ? { opacity: 1, scale: reducido ? 1 : 1.1 }
              : vivo
                ? { opacity: [0.55, 1, 0.55], scale: [0.94, 1.04, 0.94] }
                : { opacity: 0.8, scale: 1 }
          }
          transition={
            despierto || !vivo
              ? resorte
              : { duration: motionDuration.ambient * 1.5, repeat: Infinity, ease: motionEase.standard }
          }
        />
      )}
      {conAnillos && (
        <>
          {/* Cada anillo va dentro de una capa que se ABRE (escala) al despertar; el giro es de la capa de adentro. */}
          <motion.span aria-hidden="true" className="pointer-events-none absolute" style={{ inset: Math.round(tamano * 0.06) }} initial={false} animate={abrir(1.09)} transition={resorte}>
            <motion.span
              className={cn('absolute inset-0 rounded-full border border-dashed', borde)}
              initial={false}
              animate={vivo ? { rotate: 360 } : { rotate: 0 }}
              // El giro no cambia de velocidad al despertar (re-arrancarlo daría un tirón): lo que acelera es la Nebulosa.
              transition={vivo ? { duration: motionDuration.ambient * 25, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            />
          </motion.span>
          <motion.span aria-hidden="true" className="pointer-events-none absolute" style={{ inset: Math.round(tamano * 0.17) }} initial={false} animate={abrir(1.16)} transition={resorte}>
            <motion.span
              className={cn('absolute inset-0 rounded-full border', borde)}
              style={{ borderTopColor: estado === 'apagado' && !despierto ? undefined : color }}
              initial={false}
              animate={vivo ? { rotate: -360 } : { rotate: 0 }}
              transition={vivo ? { duration: motionDuration.ambient * 10, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            />
          </motion.span>
        </>
      )}
      {/* Despierto, el orbe se acerca un poco (Nico, 21:55: «que crezca, que se avive»); la Nebulosa no se toca. */}
      <motion.span className="grid place-items-center" initial={false} animate={abrir(1.07)} transition={resorte}>
        <OrbeDeAgente agente="orquestador" estado={orbe} tamano={tamano} decorativo />
      </motion.span>
    </div>
  )
}

// ── Cifras, medidores y barras ─────────────────────────────────────────────

/** Una cifra que cuenta desde 0 al aparecer y desde la anterior al cambiar. */
export function Cifra({ valor, formato, className }: { valor: number; formato?: (v: number) => string; className?: string }) {
  return (
    <AnimatedNumber
      value={valor}
      from={0}
      duration={motionDuration.reveal * 2}
      {...(formato ? { format: formato } : {})}
      className={cn('font-mono tabular-nums', className)}
    />
  )
}

export const pesos = (v: number) => formatCurrency(Math.round(v))

export interface MedidorProps {
  /** 0–1; `null` = sin dato (el anillo queda apagado). */
  valor: number | null
  /** Lo que va en el centro (la cifra). */
  centro: ReactNode
  etiqueta: string
  nota?: string
  tamano?: number
  tono?: Tono
  /** Lo que dice el lector de pantalla del anillo. */
  descripcion: string
}

const TICKS = 40
/** El arco del medidor: 270°, abierto abajo. 0° = arriba, en el sentido del reloj. */
const ARCO = 270

function marca(i: number): { x1: number; y1: number; x2: number; y2: number; mayor: boolean } {
  const grados = -ARCO / 2 + i * (ARCO / (TICKS - 1))
  const rad = (grados * Math.PI) / 180
  const mayor = i % 5 === 0
  const r1 = 47
  const r2 = mayor ? 38 : 40.5
  const r = (n: number) => Math.round(n * 100) / 100
  return { x1: r(50 + r1 * Math.sin(rad)), y1: r(50 - r1 * Math.cos(rad)), x2: r(50 + r2 * Math.sin(rad)), y2: r(50 - r2 * Math.cos(rad)), mayor }
}
const MARCAS = Array.from({ length: TICKS }, (_, i) => marca(i))

/**
 * Un medidor de anillo segmentado (270°, abierto abajo). Las marcas se pintan
 * con sus coordenadas (sin `transform`), así nada del motor de movimiento las
 * puede mover. Las encendidas se prenden una tras otra con un fundido CSS
 * (`animate-fade-in`, sólo `opacity`; con movimiento reducido la regla global
 * lo deja en un fundido corto). Sin dato, el anillo queda apagado y el centro
 * lo dice.
 */
export function Medidor({ valor, centro, etiqueta, nota, tamano = 132, tono = 'superficie', descripcion }: MedidorProps) {
  const encendidas = valor === null ? 0 : Math.round(Math.min(1, Math.max(0, valor)) * TICKS)
  const t = TONO[tono]
  const acento = tono === 'tinta' ? ACENTO_EN_TINTA : 'hsl(var(--primary))'
  return (
    <figure className="m-0 flex w-full min-w-0 max-w-[180px] flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: tamano, height: tamano }}>
        <svg viewBox="0 0 100 100" className={unir('h-full w-full', t.muted)} aria-hidden="true">
          <g strokeLinecap="round">
            {MARCAS.map((m, i) =>
              i < encendidas ? null : (
                <line key={i} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="currentColor" strokeOpacity={m.mayor ? 0.55 : 0.32} strokeWidth={m.mayor ? 2.4 : 1.8} />
              ),
            )}
          </g>
          <g strokeLinecap="round" style={{ color: acento }}>
            {MARCAS.slice(0, encendidas).map((m, i) => (
              <line
                key={`${encendidas}-${i}`}
                x1={m.x1}
                y1={m.y1}
                x2={m.x2}
                y2={m.y2}
                stroke="currentColor"
                strokeWidth={m.mayor ? 3 : 2.4}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 22, 900)}ms`, animationFillMode: 'both' }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
          <div className={unir('text-[26px] font-semibold leading-none tracking-[-0.02em]', t.fg)}>{centro}</div>
        </div>
        <span className="sr-only">{descripcion}</span>
      </div>
      <figcaption className="max-w-[180px] space-y-0.5">
        <p className={unir('text-label font-mono uppercase tracking-wide', t.muted)}>{etiqueta}</p>
        {nota && <p className={unir('text-caption', t.subtle)}>{nota}</p>}
      </figcaption>
    </figure>
  )
}

/** Una barra de avance que crece con `scaleX` (nunca `width`). */
export function BarraDeAvance({ valor, tono = 'superficie', className, etiqueta }: { valor: number; tono?: Tono; className?: string; etiqueta: string }) {
  const reducido = usePrefersReducedMotion()
  const v = Math.min(1, Math.max(0, valor))
  return (
    <div
      className={cn('h-1.5 overflow-hidden rounded-full', tono === 'tinta' ? 'bg-[color-mix(in_srgb,var(--ink-fg)_12%,transparent)]' : 'bg-surface-muted', className)}
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <motion.div
        className="h-full w-full origin-left rounded-full"
        style={{ background: tono === 'tinta' ? ACENTO_EN_TINTA : 'hsl(var(--primary))' }}
        initial={reducido ? false : { scaleX: 0 }}
        animate={{ scaleX: v }}
        transition={{ duration: motionDuration.reveal * 1.6, ease: motionEase.enter }}
      />
    </div>
  )
}

// ── Estados de una pieza ───────────────────────────────────────────────────

export interface EnPiezaProps<T> {
  pieza: Pieza<T>
  queEs: string
  tono?: Tono
  /** Alto del esqueleto mientras carga. */
  alto?: number
  children: (data: T) => ReactNode
}

/**
 * Fail-soft por pieza (la regla de la torre): cargando dice qué lee, un fallo
 * se dice con `FalloDeCarga` y su reintento, y lo que el micro no publica es
 * una línea tranquila. Nunca un 0 inventado.
 */
export function EnPieza<T>({ pieza, queEs, tono = 'superficie', alto = 96, children }: EnPiezaProps<T>) {
  const t = TONO[tono]
  if (pieza.data !== null) return <>{children(pieza.data)}</>
  if (pieza.isLoading) {
    return (
      <div role="status" aria-live="polite" className="space-y-2">
        <span className="sr-only">{`${TEXTOS.pieza.cargando} ${queEs}`}</span>
        <div
          aria-hidden="true"
          className={cn('animate-pulse rounded-md', tono === 'tinta' ? 'bg-[color-mix(in_srgb,var(--ink-fg)_8%,transparent)]' : 'bg-surface-muted')}
          style={{ height: alto }}
        />
      </div>
    )
  }
  if (pieza.error) {
    return (
      <div className={cn(tono === 'tinta' && 'rounded-lg bg-surface')}>
        <FalloDeCarga error={pieza.error} queEs={queEs} enmarcado={false} {...(pieza.reintentar ? { onReintentar: pieza.reintentar } : {})} />
      </div>
    )
  }
  return <p className={unir('text-caption', t.subtle)}>{TEXTOS.pieza.noDisponible}</p>
}

// ── La lista en vivo ───────────────────────────────────────────────────────

/**
 * Lo que entra en vivo. Lo que ya estaba al montarse NO se anima (la regla de
 * §8b); lo que llega después entra arriba con un fundido que baja 8 px y los
 * de abajo se corren (`layout="position"`, sólo `transform`). Corta a `maximo`
 * filas: 50 acciones no pesan.
 */
export function ListaEnVivo({
  items,
  maximo,
  tono = 'superficie',
  onAbrir,
  compacta = false,
}: {
  items: readonly ActivityItem[]
  maximo: number
  tono?: Tono
  onAbrir?: (id: string) => void
  compacta?: boolean
}) {
  const { t: tr } = useI18n()
  const nombre = useNombreDeAgente()
  const reducido = usePrefersReducedMotion()
  const t = TONO[tono]
  const visibles = items.slice(0, maximo)
  // Lo que había al montarse no entra animado.
  const iniciales = useRef<Set<string> | null>(null)
  if (iniciales.current === null) iniciales.current = new Set(visibles.map((i) => i.id))
  useAhora(30_000)
  return (
    <ul role="list" className="relative">
      <AnimatePresence initial={false}>
        {visibles.map((i) => {
          const nuevo = !iniciales.current?.has(i.id)
          const agente = agenteDeLaAutonomia(i.agente)
          const contenido = (
            <>
              <span className="mt-0.5 shrink-0">
                {agente ? (
                  <OrbeDeAgente agente={agente} tamano={compacta ? 18 : 22} quieto decorativo />
                ) : (
                  <UsersThree weight="duotone" className={cn('h-5 w-5', t.subtle)} aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={unir('block truncate text-body-sm', t.fg)}>{i.titulo}</span>
                {!compacta && (
                  <span className={unir('block truncate text-caption', t.subtle)}>
                    {nombre(i.agente)}
                    {i.detalle ? ` · ${i.detalle}` : ''}
                  </span>
                )}
              </span>
              <span className={unir('shrink-0 font-mono text-caption tabular-nums', t.subtle)}>{relativeTime(i.at, tr)}</span>
            </>
          )
          return (
            <motion.li
              key={i.id}
              layout={reducido ? false : 'position'}
              initial={nuevo && !reducido ? { opacity: 0, y: -motionDistance.sm } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
              transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
              className={cn('border-b last:border-b-0', t.bordeSuave)}
            >
              {onAbrir ? (
                <Button
                  variant="ghost"
                  hideArrow
                  onClick={() => onAbrir(i.id)}
                  className={cn(
                    'h-auto w-full justify-start gap-3 rounded-md px-2 py-2.5 text-left font-normal',
                    tono === 'tinta' && 'hover:bg-[color-mix(in_srgb,var(--ink-fg)_8%,transparent)]',
                  )}
                >
                  {contenido}
                </Button>
              ) : (
                <div className="flex items-start gap-3 px-2 py-2.5">{contenido}</div>
              )}
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

// ── Una decisión de la Bandeja ─────────────────────────────────────────────

/** La espera es la señal (no un chip repetido): 7 días rojo, 2 días ámbar, el resto tenue. */
export function colorDeLaEspera(desde: string, ahora: number): string {
  const dias = (ahora - new Date(desde).getTime()) / 86_400_000
  if (dias >= 7) return 'var(--danger)'
  if (dias >= 2) return 'var(--warning)'
  return 'var(--fg-subtle)'
}

export function FilaDeDecision({
  item,
  tono = 'superficie',
  onAbrir,
  ahora,
}: {
  item: InboxItem
  tono?: Tono
  onAbrir: (id: string, accion?: string) => void
  ahora: number
}) {
  const { t: tr } = useI18n()
  const t = TONO[tono]
  const agente = agenteDeLaAutonomia(item.agente)
  // Título a lo ancho; debajo, la espera y la plata a la izquierda y la acción a la derecha.
  // Así cabe igual en una columna angosta (C, a 1440) que en el teléfono.
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 shrink-0">
        {agente ? (
          <OrbeDeAgente agente={agente} tamano={24} quieto decorativo />
        ) : (
          <Tray weight="duotone" className={unir('h-5 w-5', t.subtle)} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={unir('line-clamp-2 text-body-sm font-medium', t.fg)}>{item.titulo}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className={unir('flex flex-wrap items-center gap-x-2 text-caption', t.subtle)}>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: colorDeLaEspera(item.desde, ahora) }} />
              {TEXTOS.bandeja.espera(relativeTime(item.desde, tr))}
            </span>
            {typeof item.montoCop === 'number' && <span className="whitespace-nowrap font-mono tabular-nums">{pesos(item.montoCop)}</span>}
          </p>
          <Button
            size="sm"
            variant={tono === 'tinta' ? 'secondary' : 'outline'}
            hideArrow
            className="shrink-0"
            onClick={() => onAbrir(item.id, item.accion?.label)}
          >
            {item.accion?.label ?? TEXTOS.bandeja.revisar}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── El reloj ───────────────────────────────────────────────────────────────

export function Reloj({ tono = 'superficie' }: { tono?: Tono }) {
  const ahora = useAhora(15_000)
  return (
    <span className={unir('font-mono text-caption tabular-nums', TONO[tono].muted)} title={TEXTOS.reloj}>
      {horaCorta(new Date(ahora))}
    </span>
  )
}

/** El punto de estado; late (opacity) cuando hay trabajo. */
export function PuntoDeEstado({ estado, late }: { estado: EstadoDelMando; late: boolean }) {
  const { ref, vivo } = useBucleVivo<HTMLSpanElement>()
  const color = estado === 'apagado' ? 'var(--fg-subtle)' : COLOR_DEL_ESTADO[estado]
  return (
    <span ref={ref} className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
      {late && vivo && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.6, 0], scale: [1, 2.4] }}
          transition={{ duration: motionDuration.ambient * 0.75, repeat: Infinity, ease: motionEase.exit }}
        />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  )
}
