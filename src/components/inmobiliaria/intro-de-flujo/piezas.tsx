'use client'

/**
 * Las piezas de la explicación de la primera vez de un flujo de «Nuevo»
 * (PRESENTACIONES, 05-10-2026; Nico eligió A «Héroe»): la cáscara (el `Dialog`
 * del DS con su pie fijo), el medallón ilustrado del flujo, la línea de tiempo
 * de los pasos y la lista de chequeo de «Antes de empezar».
 *
 * El contrato es el de `IntroDelFlujo` en `BotonNuevo.tsx` (`flujo` o null,
 * «Ahora no» y «Empezar»): `IntroHeroe` lo reemplazó sin tocar la lógica del
 * botón. Movimiento con los tokens de Cadence, sólo `transform` y
 * `opacity`; con movimiento reducido, quieto.
 */

import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowSquareOut, Check, type Icon } from '@phosphor-icons/react'
import {
  Stagger,
  StaggerItem,
  motionDuration,
  motionEase,
  motionSpring,
  usePrefersReducedMotion,
} from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from '@/components/ui/dialog'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import { useI18n } from '@/lib/i18n'
import { flujoIntro, type FlujoNuevo } from '@/lib/inmobiliaria/flujos'
import { cn } from '@/lib/utils'

import { CLAVES_DE_LA_INTRO } from './textos'

/** Un paso ya traducido: su ícono, su título y lo que pasa. */
export interface PasoDelFlujo {
  icono: Icon
  titulo: string
  texto: string
}

/** El mismo contrato que `IntroDelFlujo` de `BotonNuevo.tsx`. */
export interface PropsDeLaIntro {
  flujo: FlujoNuevo | null
  onCancelar: () => void
  onEmpezar: () => void
}

/** El grano de la marca (el mismo `feTurbulence` de Cadence). */
export const GRANO =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='160'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.85'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23n)'/%3E%3C/svg%3E\")"

/**
 * El foco vuelve a donde estaba al cerrar (el mismo arreglo que la
 * presentación del agente: Radix lo devuelve a un `Dialog.Trigger` que aquí no
 * existe —se abre desde «Nuevo» o su menú— y caía al `body`).
 */
function useFocoDevuelto() {
  const previo = useRef<HTMLElement | null>(null)
  return {
    recordar: () => {
      let el = document.activeElement
      // Abierta desde un ítem del menú de «Nuevo»: el ítem desaparece con el
      // menú, así que el foco vuelve al botón que abre ese menú (el de Radix
      // lo nombra con `aria-controls`).
      const menu = el instanceof HTMLElement ? el.closest<HTMLElement>('[role="menu"]') : null
      if (menu?.id) el = document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(menu.id)}"]`) ?? el
      previo.current = el instanceof HTMLElement && el !== document.body ? el : null
    },
    devolver: (e: Event) => {
      const el = previo.current
      previo.current = null
      if (el && el.isConnected) {
        e.preventDefault()
        el.focus()
      }
    },
  }
}

// ── La cáscara ──────────────────────────────────────────────────────────────

/**
 * `open` manda de verdad y el contenido es el ÚLTIMO flujo presente
 * (`useUltimoPresente`): al cerrar, Radix anima la salida con el contenido
 * todavía adentro (lo mismo que resolvió `IntroDelFlujo`).
 *
 * La cabecera del DS va escondida (`IntroHeroe` pinta su héroe); el pie es
 * el `DialogFooter` del DS: fijo, con su fondo suave, y en el celular con los
 * botones a todo el ancho y el principal arriba.
 */
export function CascaraDeLaIntro({
  flujo,
  onCancelar,
  onEmpezar,
  tamano,
  tinta = false,
  testid,
  children,
}: PropsDeLaIntro & {
  tamano: DialogSize
  tinta?: boolean
  testid: string
  children: (flujo: FlujoNuevo) => ReactNode
}) {
  const { t } = useI18n()
  const ultimo = useUltimoPresente(flujo)
  const claves = ultimo ? flujoIntro(ultimo.key) : null
  const foco = useFocoDevuelto()
  return (
    <Dialog open={Boolean(flujo)} onOpenChange={(abierto) => !abierto && onCancelar()}>
      {ultimo && claves && (
        <DialogContent
          size={tamano}
          data-testid={testid}
          data-flujo={ultimo.key}
          onCloseAutoFocus={foco.devolver}
          // El foco arranca en «Empezar» (como antes, Enter empieza), no en la primera casilla.
          onOpenAutoFocus={(e) => {
            foco.recordar()
            const empezar = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>('[data-testid="intro-empezar"]')
            if (empezar) {
              e.preventDefault()
              empezar.focus()
            }
          }}
          className={cn(tinta && 'dark border-ink-border bg-ink text-fg')}
        >
          {/* La cabecera del DS, ESCONDIDA en una caja `sr-only` (en la cabecera misma no
              alcanza: su `relative` y su relleno le ganan y asomaba el título). */}
          <div className="sr-only">
            <DialogHeader>
              <DialogTitle>{t(claves.titulo)}</DialogTitle>
              <DialogDescription>{t(claves.resumen)}</DialogDescription>
            </DialogHeader>
          </div>
          <DialogBody className="p-0 sm:p-0">{children(ultimo)}</DialogBody>
          <PieDeLaIntro flujo={ultimo} onCancelar={onCancelar} onEmpezar={onEmpezar} tinta={tinta} />
        </DialogContent>
      )}
    </Dialog>
  )
}

/** El pie: «Esto se muestra una sola vez» y las dos salidas. */
function PieDeLaIntro({
  flujo,
  onCancelar,
  onEmpezar,
  tinta,
}: {
  flujo: FlujoNuevo
  onCancelar: () => void
  onEmpezar: () => void
  tinta: boolean
}) {
  const { t } = useI18n()
  return (
    <DialogFooter className={cn('items-center sm:justify-between', tinta && 'border-ink-border')}>
      {/* Se dice que no vuelve a aparecer: si no, cerrarlo da miedo. */}
      <p className="text-caption text-fg-subtle" data-testid="intro-una-sola-vez">
        {t(CLAVES_DE_LA_INTRO.soloUnaVez)}
      </p>
      <div className="flex gap-2 max-sm:w-full max-sm:flex-col-reverse">
        <Button variant="outline" size="sm" hideArrow onClick={onCancelar} className="max-sm:w-full">
          {t(CLAVES_DE_LA_INTRO.ahoraNo)}
        </Button>
        <Button size="sm" hideArrow onClick={onEmpezar} className="max-sm:w-full" data-testid="intro-empezar">
          {t(CLAVES_DE_LA_INTRO.empezar)}
          {flujo.externo && (
            <ArrowSquareOut className="h-4 w-4" weight="bold" aria-label={t(CLAVES_DE_LA_INTRO.nuevaPestana)} />
          )}
        </Button>
      </div>
    </DialogFooter>
  )
}

/** Que `DialogContent` lo ponga en la banda del pie (reparte por marca, `ui/dialog.tsx`). */
PieDeLaIntro.bandaDeModal = 'pie' as const

// ── El medallón ilustrado ───────────────────────────────────────────────────

/**
 * El ícono del flujo bien resuelto: en un círculo con el tinte cobalto, dentro
 * de tres anillos que se dibujan hacia afuera (escala + fundido, escalonados)
 * y un anillo punteado que gira despacio. El ícono llega con un rebote leve
 * (`motionSpring.bouncy`). Decorativo: el título dice qué es.
 */
export function MedallonDelFlujo({
  icono: Icono,
  tamano = 64,
  className,
  sobreTinta = false,
}: {
  icono: Icon
  tamano?: number
  className?: string
  sobreTinta?: boolean
}) {
  const reducido = usePrefersReducedMotion()
  const lado = Math.round(tamano * 2.1)
  const anillos = [1.3, 1.62, 2.0]
  return (
    <div aria-hidden="true" data-medallon-del-flujo="" className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: lado, height: lado }}>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 26%, transparent) 0%, transparent 66%)' }}
        initial={reducido ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
      />
      {anillos.map((k, i) => (
        <motion.span
          key={k}
          className={cn(
            'absolute rounded-full border',
            sobreTinta ? 'border-ink-border' : 'border-border',
            i === 1 && 'border-dashed',
          )}
          style={{ width: tamano * k, height: tamano * k }}
          initial={reducido ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1, rotate: i === 1 && !reducido ? 360 : 0 }}
          transition={{
            opacity: { duration: motionDuration.slow, delay: 0.08 + i * 0.08 },
            scale: { duration: motionDuration.reveal, ease: motionEase.enter, delay: 0.08 + i * 0.08 },
            rotate: i === 1 && !reducido ? { duration: motionDuration.ambient * 25, repeat: Infinity, ease: 'linear' } : { duration: 0 },
          }}
        />
      ))}
      <motion.span
        className="relative grid place-items-center rounded-full bg-primary text-primary-fg shadow-md"
        style={{ width: tamano, height: tamano }}
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reducido ? { duration: motionDuration.fast } : { ...motionSpring.bouncy, delay: 0.12 }}
      >
        <Icono weight="duotone" size={Math.round(tamano * 0.46)} />
      </motion.span>
    </div>
  )
}

// ── Rótulo ──────────────────────────────────────────────────────────────────

export function Rotulo({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <p id={id} className={cn('font-mono text-label uppercase tracking-[0.08em] text-fg-subtle', className)}>
      {children}
    </p>
  )
}

// ── La línea de tiempo ──────────────────────────────────────────────────────

/**
 * Los pasos como línea de tiempo vertical: cada paso con su ícono en un nodo,
 * unidos por un riel que se DIBUJA de arriba abajo (`scaleY`, nunca `height`).
 * Los pasos entran escalonados (`Stagger`).
 */
export function LineaDeTiempo({ pasos, className, numerada = true }: { pasos: PasoDelFlujo[]; className?: string; numerada?: boolean }) {
  const reducido = usePrefersReducedMotion()
  return (
    <div className={cn('relative', className)}>
      <motion.span
        aria-hidden="true"
        className="absolute bottom-6 left-[19px] top-6 w-px origin-top bg-border"
        initial={reducido ? false : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: motionDuration.reveal * 1.6, ease: motionEase.enter, delay: 0.15 }}
      />
      <Stagger as="ol" className="relative space-y-4" delay={0.1} step={0.07} layout={false}>
        {pasos.map((p, i) => {
          const Icono = p.icono
          return (
            <StaggerItem as="li" key={p.titulo} className="flex gap-3.5" data-paso={i + 1}>
              <span className="relative z-[1] grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-primary">
                <Icono className="size-5" weight="duotone" aria-hidden="true" />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="flex items-baseline gap-2">
                  {numerada && (
                    <span className="font-mono text-label tabular-nums text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                  )}
                  <span className="text-body-sm font-semibold text-fg">{p.titulo}</span>
                </span>
                <span className="mt-0.5 block text-caption text-fg-muted">{p.texto}</span>
              </span>
            </StaggerItem>
          )
        })}
      </Stagger>
    </div>
  )
}

// ── La lista de chequeo ─────────────────────────────────────────────────────

/**
 * «Antes de empezar» como lista de chequeo: cada cosa se puede marcar («ya la
 * tengo a mano»). NO frena «Empezar»: es una ayuda, y se dice. Al marcar, el
 * visto se dibuja (el `Checkbox` del DS) y la cuenta de arriba cambia.
 */
export function ListaDeChequeo({
  items,
  idBase,
  className,
  conCuenta = true,
}: {
  items: string[]
  idBase: string
  className?: string
  conCuenta?: boolean
}) {
  const { t } = useI18n()
  const [marcados, setMarcados] = useState<ReadonlySet<number>>(new Set())
  const faltan = items.length - marcados.size
  const alternar = (i: number) =>
    setMarcados((prev) => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return s
    })
  return (
    <div className={className}>
      <Stagger as="ul" className="space-y-1" delay={0.2} layout={false}>
        {items.map((texto, i) => {
          const id = `${idBase}-${i}`
          const marcado = marcados.has(i)
          return (
            <StaggerItem as="li" key={texto}>
              <button
                type="button"
                role="checkbox"
                aria-checked={marcado}
                id={id}
                onClick={() => alternar(i)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors duration-fast ease-standard',
                  'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                data-testid="intro-chequeo"
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-fast ease-standard',
                    marcado ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong bg-surface',
                  )}
                  aria-hidden="true"
                >
                  <motion.span
                    initial={false}
                    animate={{ opacity: marcado ? 1 : 0, scale: marcado ? 1 : 0.5 }}
                    transition={motionSpring.bouncy}
                    className="grid place-items-center"
                  >
                    <Check className="size-3" weight="bold" />
                  </motion.span>
                </span>
                <span className={cn('text-body-sm transition-colors duration-fast', marcado ? 'text-fg-muted' : 'text-fg')}>{texto}</span>
              </button>
            </StaggerItem>
          )
        })}
      </Stagger>
      {conCuenta && (
        <p className="mt-2 px-2 text-caption text-fg-subtle" aria-live="polite">
          {faltan === 0 ? t(CLAVES_DE_LA_INTRO.listo) : t(CLAVES_DE_LA_INTRO.marcaLoQueTienes)}
        </p>
      )}
    </div>
  )
}
