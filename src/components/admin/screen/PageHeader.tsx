'use client'

import { usePathname } from 'next/navigation'
import { Eyebrow } from '@leasefy/cadence'

import { NAV_ITEMS } from '@/components/admin/Nav'
import { nombreDeLaSeccion, pantallaDeLaRuta } from '@/lib/admin/menu-del-admin'

/**
 * El encabezado de una pantalla del admin, el mismo de las pantallas del panel
 * de la inmobiliaria: el rótulo de la sección (`Eyebrow`), el título en
 * `text-h2` y una bajada corta; las acciones a la derecha.
 *
 * Sin `label`, el rótulo es la sección del menú a la que pertenece la ruta
 * («Cobranza», «Sistema»…).
 */
export function PageHeader({
  label,
  title,
  description,
  right,
}: {
  label?: string
  title: string
  description?: React.ReactNode
  right?: React.ReactNode
}) {
  const ruta = usePathname() ?? '/admin'
  const pantalla = pantallaDeLaRuta(ruta, NAV_ITEMS)
  const rotulo = label ?? (pantalla ? nombreDeLaSeccion(pantalla.seccion) : null) ?? 'Admin de Leasefy'
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <Eyebrow>{rotulo}</Eyebrow>
        <h1 className="text-h2 text-fg">{title}</h1>
        {description ? <p className="max-w-2xl text-body text-fg-muted">{description}</p> : null}
      </div>
      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </header>
  )
}
