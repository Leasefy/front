'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Hammer } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'

import { NAV_ITEMS } from './Nav'
import { pantallaDeLaRuta } from '@/lib/admin/menu-del-admin'
import { PageHeader } from './screen/PageHeader'
import { EmptyBlock } from './screen/states'

/**
 * Pantalla para una ruta del admin que todavía no existe: dice cuál es, para
 * que el menú se pueda recorrer entero mientras llegan las pantallas.
 */
export function Placeholder() {
  const pathname = usePathname() ?? '/admin'
  const pantalla = pantallaDeLaRuta(pathname, NAV_ITEMS)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title={pantalla?.nombre ?? 'Pantalla en construcción'} description={pantalla?.queHay} />
      <EmptyBlock
        icono={<Hammer weight="duotone" />}
        tono="neutro"
        title="Esta pantalla todavía no está lista"
        hint="Mientras tanto, lo de hoy está en el Resumen."
        accion={
          <Button asChild size="sm" variant="outline" hideArrow>
            <Link href="/admin">Ir al Resumen</Link>
          </Button>
        }
      />
    </div>
  )
}
