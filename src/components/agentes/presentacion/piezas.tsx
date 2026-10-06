'use client'

/**
 * Las piezas de la presentación de un agente (PRESENTACIONES, 05-10-2026;
 * dirección A «Escenario», la que eligió Nico): la cáscara (el `Dialog` del
 * DS), el fondo de marca, el orbe que despierta con sus dos anillos, el modo y
 * el «¿Cómo funciona?».
 *
 * El lenguaje es el del centro de mando del piloto automático (PILOTO-MANDO):
 * la superficie de marca `bg-ink` con grano y una luz que respira, los rótulos
 * en mono, el orbe con su halo. Se comparte el LENGUAJE, no los archivos: nada
 * de aquí importa de `inmobiliaria/piloto/mando/`.
 *
 * Movimiento (`docs/DESIGN.md` §8b): tokens de Cadence, sólo `transform` y
 * `opacity`. Los bucles decorativos (la luz que respira, los anillos que
 * giran) duran `motionDuration.ambient`, se pausan fuera de pantalla y no
 * existen con movimiento reducido. El orbe lo pinta el motor de Cadence (la
 * Nebulosa TAL CUAL, `memory/elegida-tal-cual.md`): aquí sólo se le dice el
 * estado.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import { Question, X } from '@phosphor-icons/react'
import {
  AGENT_ORB_PALETTES,
  motionDuration,
  motionEase,
  usePrefersReducedMotion,
} from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { ASPA_DE_CIERRE } from '@/components/ui/aspa-de-cierre'
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from '@/components/ui/dialog'
import { PasosExplicados } from '@/components/ui/pasos-explicados'
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import type { EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import { agentePorId } from '@/lib/agentes/equipo'
import type { AutonomiaModo } from '@/lib/api/piloto'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { CLAVES_COMUNES, type FichaDePresentacion } from './textos'

// ── El contrato ─────────────────────────────────────────────────────────────

/** Cómo se cierra: «Empezar» la deja vista (`completo`); Esc, el fondo o la ✕, `omitido`. */
export type ComoSeCerro = 'completo' | 'omitido'

/**
 * Lo que recibe la presentación: el MISMO contrato que tenía
 * `PresentacionDelAgente` (abierta + al cerrar), más el modo en que está el
 * agente y si el piloto automático está activo (de la flota).
 */
export interface PropsDePresentacion {
  ficha: FichaDePresentacion
  abierta: boolean
  onCerrar: (como: ComoSeCerro) => void
  /** El modo del agente para esta inmobiliaria (de la flota). Sin dato: con el que arranca. */
  modo?: AutonomiaModo
  /** ¿El piloto automático está activo? Sin él, Automático rige como Copiloto. */
  pilotoActivo?: boolean | null
  /** Para devolver el foco a otro lado (la presentación se abre sola). */
  onCloseAutoFocus?: (e: Event) => void
  /** El `data-testid` del modal y el de su ✕ (los de siempre de cada lugar). */
  testid?: string
  testidCerrar?: string
}

// ── El foco ─────────────────────────────────────────────────────────────────

/**
 * El foco vuelve a donde estaba. Radix lo devuelve a su `Dialog.Trigger`, y
 * estas presentaciones no tienen (se abren solas o desde un menú): sin esto el
 * foco caía al `body`. Se recuerda el elemento enfocado JUSTO antes de mover el
 * foco adentro (`onOpenAutoFocus` corre antes de que Radix lo mueva) y se le
 * devuelve al cerrar, si sigue en la página. Si quien abre pasa su propio
 * `onCloseAutoFocus` (p. ej. `PilotoNovedad`, que vuelve a «¿Cómo funciona?»)
 * y lo resuelve, manda el suyo.
 */
export function useFocoDevuelto(propio?: (e: Event) => void) {
  const previo = useRef<HTMLElement | null>(null)
  return {
    recordar: () => {
      const el = document.activeElement
      previo.current = el instanceof HTMLElement && el !== document.body ? el : null
    },
    devolver: (e: Event) => {
      propio?.(e)
      const el = previo.current
      previo.current = null
      if (e.defaultPrevented) return
      if (el && el.isConnected) {
        e.preventDefault()
        el.focus()
      }
    },
  }
}

// ── La cáscara ──────────────────────────────────────────────────────────────

/**
 * El modal del DS (`@/components/ui/dialog`): foco atrapado, Esc, velo con
 * desenfoque, la ✕ del producto y, bajo 640 px, la hoja que sube desde abajo.
 * La cabecera va escondida (`sr-only`; la presentación pinta su propio título
 * grande): el título y la descripción se anuncian sin tocar el tamaño que fija
 * Cadence. El cuerpo es nuestro (`DialogBody` sin relleno).
 *
 * `tinta`: todo el modal sobre la superficie de marca, la misma en claro y en
 * oscuro (`.dark` en el panel: los tokens de adentro —la ✕, los botones— se
 * leen sobre lo oscuro).
 */
export function CascaraDePresentacion({
  abierta,
  onCerrar,
  onCloseAutoFocus,
  titulo,
  descripcion,
  tamano,
  tinta = false,
  testid,
  testidCerrar,
  className,
  children,
}: {
  abierta: boolean
  onCerrar: (como: ComoSeCerro) => void
  onCloseAutoFocus?: (e: Event) => void
  titulo: string
  descripcion: string
  tamano: DialogSize
  tinta?: boolean
  testid: string
  testidCerrar?: string
  className?: string
  children: ReactNode
}) {
  const { t } = useI18n()
  const foco = useFocoDevuelto(onCloseAutoFocus)
  return (
    <Dialog open={abierta} onOpenChange={(o) => !o && onCerrar('omitido')}>
      <DialogContent
        size={tamano}
        data-testid={testid}
        // La ✕ del producto (el mismo dibujo que `AspaDeCierre`), con el
        // `data-testid` que cada lugar ya usaba.
        closeButton={
          <DialogClose aria-label={t('common.close')} data-testid={testidCerrar ?? 'dialog-close'} className={ASPA_DE_CIERRE}>
            <X size={16} weight="bold" aria-hidden="true" />
          </DialogClose>
        }
        onCloseAutoFocus={foco.devolver}
        // El foco arranca en el llamado principal (Enter = empezar), no en «¿Cómo funciona?».
        onOpenAutoFocus={(e) => {
          foco.recordar()
          const principal = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
            '[data-testid="presentacion-empezar"]',
          )
          if (principal) {
            e.preventDefault()
            principal.focus()
          }
        }}
        className={cn(tinta && 'dark border-ink-border bg-ink text-fg', className)}
      >
        {/* La cabecera del DS, ESCONDIDA en una caja `sr-only`: anuncia el título y la
            descripción. `sr-only` puesto en la cabecera misma no alcanza — su `relative`
            y su relleno le ganan y asomaban dos letras del título arriba. */}
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </DialogHeader>
        </div>
        <DialogBody className="p-0 sm:p-0">{children}</DialogBody>
      </DialogContent>
    </Dialog>
  )
}

// ── El fondo de marca ───────────────────────────────────────────────────────

/** El grano de la marca (el mismo `feTurbulence` de Cadence y del mando). */
export const GRANO =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='160'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.85'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23n)'/%3E%3C/svg%3E\")"

/** La luz del agente: el halo de SU orbe (la paleta del registro), nunca un color suelto. */
export function luzDelAgente(ficha: FichaDePresentacion): string {
  const paleta = AGENT_ORB_PALETTES[agentePorId(ficha.agente).orbe.paleta]
  return paleta?.glow ?? 'var(--primary)'
}

/** ¿Se puede animar un bucle aquí? (en pantalla y sin movimiento reducido). */
export function useBucleVivo<T extends Element>(): { ref: React.RefObject<T | null>; vivo: boolean } {
  const ref = useRef<T | null>(null)
  const enPantalla = useInView(ref, { margin: '80px' })
  const reducido = usePrefersReducedMotion()
  return { ref, vivo: enPantalla && !reducido }
}

/**
 * El fondo de marca: la luz del agente que respira detrás del orbe y el
 * grano. `barrido`: una franja de luz cruza una vez al abrir (como un
 * escaneo). Decorativo.
 *
 * 🔴 Sin la retícula de círculos concéntricos grandes ni las líneas de puntos
 * que cruzaban el modal (Nico, 05-10 19:10: «sin esas líneas alrededor que son
 * enormes, sólo las de la orbe que tiene y ya»). Las únicas líneas son los dos
 * anillos del orbe (`OrbeQueDespierta`).
 */
export function FondoDeMarca({ luz, centro = '50% 42%', barrido = false }: { luz: string; centro?: string; barrido?: boolean }) {
  const { ref, vivo } = useBucleVivo<HTMLDivElement>()
  const reducido = usePrefersReducedMotion()
  const [x, y] = centro.split(' ')
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" data-fondo-de-marca="">
      <motion.div
        className="absolute h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: x,
          top: y,
          background: `radial-gradient(circle, color-mix(in srgb, ${luz} 34%, transparent) 0%, color-mix(in srgb, ${luz} 10%, transparent) 38%, transparent 64%)`,
        }}
        initial={reducido ? false : { opacity: 0, scale: 0.9 }}
        animate={vivo ? { opacity: [0.75, 1, 0.75], scale: [0.98, 1.03, 0.98] } : { opacity: 0.9, scale: 1 }}
        transition={
          vivo
            ? { duration: motionDuration.ambient * 2, repeat: Infinity, ease: motionEase.standard }
            : { duration: motionDuration.reveal, ease: motionEase.enter }
        }
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--ink) 92%, transparent), transparent)' }}
      />
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: GRANO }} />
      {barrido && !reducido && (
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3"
          style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${luz} 16%, transparent), transparent)` }}
          initial={{ x: '-110%', opacity: 0 }}
          animate={{ x: '340%', opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.35, duration: motionDuration.ambient * 0.75, ease: motionEase.emphasis }}
        />
      )}
    </div>
  )
}

// ── El orbe que despierta ───────────────────────────────────────────────────

/** Quieto → pensando → trabajando → listo, en ms desde que abre. */
export const DESPERTAR: ReadonlyArray<{ estado: EstadoDelOrbe; enMs: number }> = [
  { estado: 'pensando', enMs: 350 },
  { estado: 'trabajando', enMs: 1100 },
  { estado: 'listo', enMs: 2500 },
]

/** El estado del orbe mientras despierta; con movimiento reducido, `listo` de una. */
export function useDespertar(): EstadoDelOrbe {
  const reducido = usePrefersReducedMotion()
  const [estado, setEstado] = useState<EstadoDelOrbe>('quieto')
  useEffect(() => {
    if (reducido) {
      setEstado('listo')
      return
    }
    setEstado('quieto')
    const timers = DESPERTAR.map((p) => window.setTimeout(() => setEstado(p.estado), p.enMs))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [reducido])
  return estado
}

/**
 * El orbe del agente (TAL CUAL: `OrbeDeAgente`) con un halo de SU luz que
 * respira y sus DOS anillos —uno punteado y uno con el arco de su color— que
 * giran en sentidos contrarios y entran dibujándose. El halo y los anillos van
 * por fuera del orbe: el orbe no se toca. Son las únicas líneas del escenario.
 */
export function OrbeQueDespierta({
  ficha,
  tamano,
  estado,
  className,
}: {
  ficha: FichaDePresentacion
  tamano: number
  estado: EstadoDelOrbe
  className?: string
}) {
  const { ref, vivo } = useBucleVivo<HTMLDivElement>()
  const reducido = usePrefersReducedMotion()
  const luz = luzDelAgente(ficha)
  const lado = Math.round(tamano * 1.62)
  return (
    <div
      ref={ref}
      className={cn('relative grid shrink-0 place-items-center', className)}
      style={{ width: lado, height: lado }}
      data-orbe-de-la-presentacion={ficha.agente}
      data-estado={estado}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${luz} 30%, transparent) 0%, transparent 66%)` }}
        initial={reducido ? false : { opacity: 0, scale: 0.7 }}
        animate={vivo ? { opacity: [0.6, 1, 0.6], scale: [0.95, 1.04, 0.95] } : { opacity: 0.85, scale: 1 }}
        transition={
          vivo
            ? { duration: motionDuration.ambient * 1.5, repeat: Infinity, ease: motionEase.standard }
            : { duration: motionDuration.reveal, ease: motionEase.enter }
        }
      />
      <motion.span
        aria-hidden="true"
        data-anillo-del-orbe="punteado"
        className="pointer-events-none absolute rounded-full border border-dashed border-border-strong"
        style={{ inset: Math.round(tamano * 0.05) }}
        initial={reducido ? false : { opacity: 0, scale: 0.86, rotate: -40 }}
        animate={vivo ? { opacity: 1, scale: 1, rotate: 320 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={
          vivo
            ? {
                opacity: { duration: motionDuration.reveal },
                scale: { duration: motionDuration.reveal, ease: motionEase.enter },
                rotate: { duration: motionDuration.ambient * 24, repeat: Infinity, ease: 'linear' },
              }
            : { duration: motionDuration.reveal, ease: motionEase.enter }
        }
      />
      <motion.span
        aria-hidden="true"
        data-anillo-del-orbe="arco"
        className="pointer-events-none absolute rounded-full border border-border"
        style={{ inset: Math.round(tamano * 0.16), borderTopColor: `color-mix(in srgb, ${luz} 80%, transparent)` }}
        initial={reducido ? false : { opacity: 0, scale: 0.9, rotate: 60 }}
        animate={vivo ? { opacity: 1, scale: 1, rotate: -300 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={
          vivo
            ? {
                opacity: { duration: motionDuration.reveal, delay: 0.15 },
                scale: { duration: motionDuration.reveal, ease: motionEase.enter, delay: 0.15 },
                rotate: { duration: motionDuration.ambient * 9, repeat: Infinity, ease: 'linear' },
              }
            : { duration: motionDuration.reveal, ease: motionEase.enter }
        }
      />
      <motion.div
        className="relative flex"
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reducido ? { duration: motionDuration.fast } : { duration: motionDuration.reveal, ease: motionEase.enter }}
      >
        <OrbeDeAgente agente={ficha.agente} tamano={tamano} estado={estado} decorativo />
      </motion.div>
    </div>
  )
}

// ── Rótulos ─────────────────────────────────────────────────────────────────

/** El rótulo mono en mayúsculas (como los del mando). */
export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-mono text-label uppercase tracking-[0.08em] text-fg-subtle', className)}>{children}</p>
}

/** El punto que late junto al modo (sólo opacidad y escala). */
export function PuntoQueLate({ color, className }: { color: string; className?: string }) {
  const { ref, vivo } = useBucleVivo<HTMLSpanElement>()
  return (
    <span ref={ref} className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden="true">
      {vivo && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.6, 0], scale: [1, 2.6] }}
          transition={{ duration: motionDuration.ambient * 0.75, repeat: Infinity, ease: motionEase.exit }}
        />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  )
}

// ── El modo ─────────────────────────────────────────────────────────────────

/**
 * El modo que rige: sin el piloto automático activo, Automático rige como
 * Copiloto (`piloto-activo.ts`). Se dice el elegido y se explica el que rige.
 */
export function modoQueRige(modo: AutonomiaModo, pilotoActivo: boolean | null | undefined): AutonomiaModo {
  return modo === 'autonomo' && pilotoActivo !== true ? 'copiloto' : modo
}

/**
 * Lo que significa el modo para este agente (o «a pedido», si el modo no
 * cambia lo que hace), y el aviso si se eligió Automático sin el piloto
 * automático activo.
 */
export function BloqueDelModo({
  ficha,
  modo,
  pilotoActivo,
  className,
}: {
  ficha: FichaDePresentacion
  modo: AutonomiaModo
  pilotoActivo?: boolean | null
  className?: string
}) {
  const { t } = useI18n()
  const rige = modoQueRige(modo, pilotoActivo)
  const frase = ficha.modo.gobierna ? t(ficha.modo.queHace[rige]) : t(ficha.modo.aPedido)
  const avisoDelPiloto = ficha.modo.gobierna && modo === 'autonomo' && pilotoActivo !== true
  return (
    <div className={cn('space-y-2.5', className)} data-testid="modo-del-agente" data-modo={ficha.modo.gobierna ? modo : 'a-pedido'}>
      <p className="text-body-sm text-fg-muted">{frase}</p>
      {avisoDelPiloto && <p className="text-caption text-fg-subtle">{t(CLAVES_COMUNES.sinPilotoActivo)}</p>}
    </div>
  )
}

// ── «¿Cómo funciona?» ───────────────────────────────────────────────────────

/**
 * El llamado secundario «¿Cómo funciona?»: abre el CAJÓN de explicaciones del
 * panel (el mismo `Cajon` que `ParaEntenderMas`, con `PasosExplicados`
 * adentro) por ENCIMA de la presentación, sin cerrarla. Los pasos son los de
 * la pantalla del agente (los verificó COMO-FUNCIONA); el foco vuelve a este
 * botón al cerrar el cajón.
 *
 * No usa `ParaEntenderMas` tal cual porque su botón se pinta con su propia
 * variante: aquí el botón es el de la presentación y el cajón, el mismo.
 */
export function ComoFuncionaDelAgente({ ficha, className }: { ficha: FichaDePresentacion; className?: string }) {
  const { t } = useI18n()
  const [abierto, setAbierto] = useState(false)
  // La clave sin texto nunca se pinta: cae al respaldo.
  const texto = (clave: string | undefined, respaldo = ''): string => {
    if (!clave) return respaldo
    const v = t(clave)
    return v && v !== clave ? v : respaldo
  }
  const { ns, pasos } = ficha.comoFunciona
  const titulo = ns ? texto(`${ns}.comoFunciona.titulo`, t(CLAVES_COMUNES.comoFunciona)) : texto(ficha.comoFunciona.titulo, t(CLAVES_COMUNES.comoFunciona))
  const descripcion = ns ? texto(`${ns}.comoFunciona.descripcion`) : texto(ficha.comoFunciona.descripcion)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        hideArrow
        className={className}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        data-testid="presentacion-como-funciona"
        onClick={(e) => {
          e.currentTarget.focus()
          setAbierto(true)
        }}
      >
        <Question className="h-4 w-4" aria-hidden="true" />
        {t(CLAVES_COMUNES.comoFunciona)}
      </Button>
      <Cajon abierto={abierto} onOpenChange={setAbierto} tamano="md" data-testid="presentacion-como-funciona-cajon">
        <CajonCabecera titulo={titulo} descripcion={descripcion || undefined} />
        <CajonCuerpo>
          <PasosExplicados
            pasos={pasos.map((p, i) => ({
              id: p.clave ?? `paso-${i + 1}`,
              icono: p.icono,
              quien: p.quien,
              titulo: p.clave ? texto(`${ns}.comoFunciona.${p.clave}.title`) : texto(p.titulo),
              explicacion: p.clave ? texto(`${ns}.comoFunciona.${p.clave}.desc`) : texto(p.explicacion),
              tuParte: (p.clave ? (p.conTuParte ? texto(`${ns}.comoFunciona.${p.clave}.tuParte`) : '') : texto(p.tuParte)) || undefined,
            }))}
          />
        </CajonCuerpo>
      </Cajon>
    </>
  )
}
