'use client'

/**
 * RielDePestanas — las lecturas hermanas de UNA pantalla, como cards chicas
 * dentro de un rectángulo hundido.
 *
 * Es el tercer nivel del panel y el más chico de los tres:
 *
 *   [Cobrar a inquilinos] [Pagar a propietarios]   ← la CARA del módulo
 *   [Pagos] [Recaudo] [Cartera] [Cobranza IA]      ← las SECCIONES (N3)
 *   [Por edad] [Por concepto] [Por pagar] […]      ← ESTE riel: las lecturas
 *
 * Nació dentro de `PestanasDeCartera` y salió acá el 2026-09-16, cuando
 * Liquidaciones necesitó el mismo riel para su cola de aprobaciones. Copiarlo
 * habría sido la tercera versión del mismo rectángulo con dos píxeles de
 * diferencia; el dibujo es el de `nivel="secciones"` de `BarraDePestanas`, a
 * propósito, porque la relación que expresa es la misma: pantallas hermanas
 * entre las que se pasa.
 *
 * Son ENLACES y no un control de estado: cada lectura es una URL que se puede
 * compartir y a la que se puede volver. Y la marca es EXACTA — con coincidencia
 * por prefijo, la raíz quedaría activa estando en cualquier hija, que es justo
 * el defecto que hace que un riel de pestañas deje de servir.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface PestanaDelRiel {
  href: string
  /** Clave i18n; se resuelve con `t()` al pintar. */
  labelKey: string
  icon: Icon
}

export interface RielDePestanasProps {
  items: readonly PestanaDelRiel[]
  /** Cómo se llama el conjunto para un lector de pantalla (clave i18n o texto). */
  ariaLabel: string
}

export function RielDePestanas({ items, ariaLabel }: RielDePestanasProps) {
  const pathname = usePathname() ?? ''
  const { t } = useI18n()

  return (
    <nav aria-label={ariaLabel}>
      <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[12px] bg-surface-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p) => {
          const activa = pathname === p.href
          const Icono = p.icon
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'group flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-[13px] transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-muted',
                activa
                  ? 'bg-surface font-medium text-fg shadow-sm'
                  : 'text-fg-muted hover:bg-surface/60 hover:text-fg',
              )}
            >
              <Icono
                className={cn('h-4 w-4', activa ? 'text-primary' : 'text-fg-subtle group-hover:text-fg')}
                weight={activa ? 'fill' : 'regular'}
                aria-hidden="true"
              />
              {t(p.labelKey)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
