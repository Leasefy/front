import { PageGuard } from '@/components/auth/PageGuard'

import { CalceClient } from './CalceClient'

/**
 * /panel/inmobiliaria/pipeline/calce — G-02: qué se le manda a cada lead, y a
 * qué leads les calza un inmueble que se libera.
 */
export default function CalcePage() {
  return (
    <PageGuard module="pipeline">
      <CalceClient />
    </PageGuard>
  )
}
