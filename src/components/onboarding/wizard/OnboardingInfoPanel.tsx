'use client'

/**
 * La columna informativa del asistente: por qué se pide lo que se pide en el
 * paso, en tres razones cortas. Acompaña, no compite: superficie blanca con el
 * mismo borde que todo, una foto de marca arriba (sólo en escritorio, donde
 * hay aire para ella) y texto en gris.
 *
 * Las fotos son las `leasefy-brand-*` que ya usan el recorrido del panel y la
 * presentación de los agentes. Van con `next/image` (`sizes` del ancho de la
 * columna), así que en teléfono, donde la foto no se pinta, no se descarga la
 * versión grande.
 *
 * Al cambiar de paso el contenido se funde (clave = el paso). Con «reducir
 * movimiento» el `MotionConfig` del marco deja sólo el fundido.
 */

import type { ReactNode } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface RazonDelPaso {
  icono: Icon
  texto: string
}

export interface OnboardingInfoPanelProps {
  /** Cambia cuando cambia el paso: es la clave del fundido. */
  pasoId: string
  /** El rótulo de arriba, en versalitas («Por qué te lo pedimos»). */
  rotulo: string
  titulo: string
  razones: RazonDelPaso[]
  /** Una línea de cierre con su ícono (la de los datos protegidos…). */
  pie?: { icono: Icon; texto: ReactNode }
  /** Ruta de una foto de `public/`. Decorativa: `alt=""`. */
  foto?: string
  className?: string
}

/** El ancho de la columna en escritorio; en teléfono la foto no se pinta. */
const TAMANOS_DE_LA_FOTO = '(min-width: 1280px) 296px, (min-width: 1024px) 272px, 1px'

export function OnboardingInfoPanel({
  pasoId,
  rotulo,
  titulo,
  razones,
  pie,
  foto,
  className,
}: OnboardingInfoPanelProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pasoId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {foto ? (
            <div className="relative hidden aspect-[4/3] overflow-hidden bg-surface-muted lg:block">
              <Image src={foto} alt="" fill sizes={TAMANOS_DE_LA_FOTO} className="object-cover" />
            </div>
          ) : null}

          <div className="p-5 sm:p-6">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {rotulo}
            </p>
            <h2 className="mt-3 text-balance font-heading text-[17px] font-medium leading-snug tracking-[-0.01em] text-fg">
              {titulo}
            </h2>

            <ul className="mt-4 space-y-3">
              {razones.map(({ icono: Icono, texto }) => (
                <li key={texto} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
                  >
                    <Icono className="h-3.5 w-3.5" weight="bold" />
                  </span>
                  <span className="pt-1 text-body-sm leading-snug text-fg-muted">{texto}</span>
                </li>
              ))}
            </ul>

            {pie ? (
              <p className="mt-5 flex items-start gap-2.5 border-t border-border-faint pt-4 text-caption text-fg-muted">
                <pie.icono className="mt-px h-4 w-4 shrink-0 text-success" weight="fill" aria-hidden />
                <span>{pie.texto}</span>
              </p>
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
