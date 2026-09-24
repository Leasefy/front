import { PageGuard } from '@/components/auth/PageGuard'

import { PortalesClient } from './PortalesClient'

/**
 * /panel/inmobiliaria/inmuebles/portales — publicar y despublicar en los
 * portales con las cuentas que la inmobiliaria ya paga (Nico, 17-09-2026),
 * mostrando el estado de cada publicación.
 *
 * Cuelga de `portafolio`, igual que el interruptor de publicación de la ficha.
 */
export default function PortalesPage() {
  return (
    <PageGuard module="portafolio">
      <PortalesClient />
    </PageGuard>
  )
}
