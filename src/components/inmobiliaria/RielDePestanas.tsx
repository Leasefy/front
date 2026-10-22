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
 *
 * Movimiento (sistema de Cadence): la card blanca de la activa es un
 * `MotionIndicator` (resorte ágil) que se desliza de una lectura a otra cuando
 * el riel sigue montado; con movimiento reducido salta.
 */

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { usePathname } from 'next/navigation'
import { MotionIndicator } from '@leasefy/cadence'
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
  /**
   * Cuántas se ven en el riel (22-10, revisión de Dinero: «7 pestañas → 4 + Más»).
   * Las demás van en «Más ▾»; la elegida siempre está a la vista. Sin el dato,
   * todas en fila como siempre.
   */
  visibles?: number
}

export function RielDePestanas({ items, ariaLabel, visibles }: RielDePestanasProps) {
  const pathname = usePathname() ?? ''
  const { t } = useI18n()
  const id = useId()
  const indicador = `${id}-activa`
  const [masAbierto, setMasAbierto] = useState(false)
  const masRef = useRef<HTMLDivElement>(null)
  /** El menú vive fuera del riel: también cuenta como «adentro» (si no, el toque lo cerraba antes de navegar). */
  const menuRef = useRef<HTMLDivElement>(null)

  // Las que van en el riel y las que van en «Más»: la elegida nunca se esconde.
  const cuantas = visibles && items.length > visibles + 1 ? visibles : items.length
  const enElRiel = items.slice(0, cuantas)
  const enMas = items.slice(cuantas)
  const activaEscondida = enMas.find((p) => p.href === pathname)
  const riel = activaEscondida ? [...enElRiel, activaEscondida] : enElRiel
  const menu = enMas.filter((p) => p !== activaEscondida)

  useEffect(() => {
    if (!masAbierto) return
    const fuera = (e: MouseEvent) => {
      const dentro = masRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)
      if (!dentro) setMasAbierto(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMasAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [masAbierto])

  return (
    <nav aria-label={ariaLabel}>
      <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[12px] bg-surface-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {riel.map((p) => {
          const activa = pathname === p.href
          const Icono = p.icon
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'group relative isolate flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-[13px] transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-muted',
                activa
                  ? 'font-medium text-fg'
                  : 'text-fg-muted hover:bg-surface/60 hover:text-fg',
              )}
            >
              {activa && (
                <MotionIndicator
                  layoutId={indicador}
                  data-indicador-de-la-activa=""
                  className="inset-0 -z-10 rounded-sm bg-surface shadow-sm"
                />
              )}
              <Icono
                className={cn('h-4 w-4', activa ? 'text-primary' : 'text-fg-subtle group-hover:text-fg')}
                weight={activa ? 'fill' : 'regular'}
                aria-hidden="true"
              />
              {t(p.labelKey)}
            </Link>
          )
        })}
        {menu.length > 0 ? (
          <div ref={masRef} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={masAbierto}
              aria-controls={`${id}-mas`}
              onClick={() => setMasAbierto((v) => !v)}
              className="flex h-8 items-center gap-1 rounded-sm px-3 text-[13px] text-fg-muted transition-colors hover:bg-surface/60 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="riel-mas"
            >
              {t('common.more')}
              <CaretDown className={cn('h-3.5 w-3.5 transition-transform', masAbierto && 'rotate-180')} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      {/* El menú va FUERA del riel (que recorta con overflow) y montado siempre: sus
          enlaces existen para el teclado, la búsqueda y las pruebas aunque esté cerrado. */}
      {menu.length > 0 ? (
        <div
          ref={menuRef}
          id={`${id}-mas`}
          hidden={!masAbierto}
          className="relative z-20"
        >
          <div className="absolute left-0 top-1 min-w-[220px] rounded-[12px] border border-border bg-surface p-1 shadow-lg">
            {menu.map((p) => {
              const Icono = p.icon
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  onClick={() => setMasAbierto(false)}
                  className="flex h-9 items-center gap-2 rounded-sm px-3 text-[13px] text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icono className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                  {t(p.labelKey)}
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
    </nav>
  )
}
