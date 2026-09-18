import { PageGuard } from '@/components/auth/PageGuard'

import { OrigenesClient } from './OrigenesClient'

/**
 * /panel/inmobiliaria/pipeline/origenes — «¿qué portal vale la pena pagar?»
 *
 * La pregunta que Nico hizo el 17-09 y que el producto no podía contestar: la
 * inmobiliaria paga Fincaraíz, Metrocuadrado y Mercado Libre todos los meses y
 * no sabía cuál le trajo un contrato. Cuelga del módulo `pipeline`, que es el
 * que el asesor comercial ya tiene.
 */
export default function OrigenesDeLeadsPage() {
  return (
    <PageGuard module="pipeline">
      <OrigenesClient />
    </PageGuard>
  )
}
