'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './Nav'

/**
 * Temporary screen for admin routes not yet built (Fase 1+). Shows which
 * section it is so the nav is fully walkable while screens land incrementally.
 * Replace each with its real screen per the FRONT.md §6 inventory.
 */
export function Placeholder() {
  const pathname = usePathname()
  const item = NAV_ITEMS.find((n) => n.href === pathname || (n.href !== '/admin' && pathname.startsWith(n.href)))

  return (
    <div className="p-6 lg:p-8">
      <div className="section-label mb-3">{item?.hint ?? 'pantalla'}</div>
      <h1 className="font-display text-display tracking-tight text-fg mb-2">{item?.label ?? 'Pendiente'}</h1>
      <p className="text-sm text-fg-muted max-w-lg">
        Pantalla en construcción. Se implementa en una fase siguiente según el inventario de
        <span className="font-mono"> FRONT.md §6</span>.
      </p>
      <div className="mt-6 card p-4 inline-block">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">ruta</div>
        <div className="font-mono text-sm text-fg mt-0.5">{pathname}</div>
      </div>
    </div>
  )
}
