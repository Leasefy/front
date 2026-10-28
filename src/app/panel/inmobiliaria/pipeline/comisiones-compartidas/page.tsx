import { PageGuard } from '@/components/auth/PageGuard'
import { ComisionCompartida } from '@/components/inmobiliaria/comisiones-compartidas/ComisionCompartida'

/** /panel/inmobiliaria/pipeline/comisiones-compartidas — el reparto de la comisión con otra inmobiliaria (28-10-2026). */
export default function ComisionesCompartidasPage() {
  return (
    <PageGuard module="pipeline" seccion="Comisión compartida">
      <ComisionCompartida />
    </PageGuard>
  )
}
