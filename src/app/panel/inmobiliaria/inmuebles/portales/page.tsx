import { redirect } from 'next/navigation'

import { PageGuard } from '@/components/auth/PageGuard'

import { PortalesClient } from './PortalesClient'

/**
 * /panel/inmobiliaria/inmuebles/portales — publicar y despublicar en los
 * portales con las cuentas que la inmobiliaria ya paga (Nico, 17-09-2026),
 * mostrando el estado de cada publicación.
 *
 * Cuelga de `portafolio`, igual que el interruptor de publicación de la ficha.
 */
export default async function PortalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // La pestaña «Calidad» se fue a «Agentes IA» (Nico, 08-10): el enlace viejo lleva allá.
  if ((await searchParams).pestana === 'calidad') redirect('/panel/inmobiliaria/inmuebles/calidad-de-publicaciones')
  return (
    <PageGuard module="portafolio">
      <PortalesClient />
    </PageGuard>
  )
}
