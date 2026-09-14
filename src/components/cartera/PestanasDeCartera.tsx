'use client'

/**
 * Las tres lecturas de la cartera, como tres pantallas hermanas.
 *
 * Nico (2026-09-12): «Ver la cartera: los cobros pendientes de los inquilinos
 * y los pagos pendientes, dividido por CONCEPTO. […] Y cuánto le debe la
 * inmobiliaria al propietario, por mes. Esos deben de ser módulos.»
 *
 * Son la MISMA plata mirada de tres formas, así que viven bajo la misma ruta
 * (`/cobros/cartera`) y no como tres filas del sidebar:
 *
 *   · Por edad      — cuánto hace que está vencida (la que ya existía).
 *   · Por concepto  — cuánto debe cada inquilino, por mes y por concepto.
 *   · Por pagar     — cuánto le debemos a cada propietario, por mes.
 *
 * Son enlaces y no un control de estado a propósito: cada lectura es una URL
 * que se puede compartir y a la que se puede volver, y el sidebar sigue
 * marcando «Cartera» en las tres (`arquitectura-del-panel.ts` deja activa la
 * pantalla cuando la ruta cuelga de su `href`).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarBlank, CurrencyCircleDollar, HandCoins } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

const RAIZ = '/panel/inmobiliaria/cobros/cartera'

export const PESTANAS_DE_CARTERA = [
  { href: RAIZ, label: 'Por edad', icon: CalendarBlank },
  { href: `${RAIZ}/conceptos`, label: 'Por concepto', icon: CurrencyCircleDollar },
  { href: `${RAIZ}/por-pagar`, label: 'Por pagar a propietarios', icon: HandCoins },
] as const

export function PestanasDeCartera() {
  const pathname = usePathname() ?? ''

  return (
    <nav aria-label="Cómo mirar la cartera">
      <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[12px] bg-surface-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PESTANAS_DE_CARTERA.map((p) => {
          // Exacta: `/cartera` no puede quedar activa estando en `/conceptos`.
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
              {p.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
