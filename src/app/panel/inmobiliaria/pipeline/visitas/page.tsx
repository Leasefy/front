import { PageGuard } from '@/components/auth/PageGuard'

import { VisitasClient } from './VisitasClient'

/**
 * /panel/inmobiliaria/pipeline/visitas — E-03 («nunca visitas sin asesor»), el
 * aviso al inquilino que vive adentro (D-02), el recordatorio y el no-show.
 */
export default function VisitasPage() {
  return (
    <PageGuard module="pipeline">
      <VisitasClient />
    </PageGuard>
  )
}
