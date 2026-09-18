import { PageGuard } from '@/components/auth/PageGuard'

import { ReclamosClient } from './ReclamosClient'

/**
 * /panel/inmobiliaria/postulaciones/reclamos — F-07: el canal del candidato
 * rechazado para pedir detalle o corregir un dato.
 */
export default function ReclamosPage() {
  return (
    <PageGuard module="pipeline">
      <ReclamosClient />
    </PageGuard>
  )
}
