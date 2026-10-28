import { PageGuard } from '@/components/auth/PageGuard'
import { TuDia } from '@/components/inmobiliaria/tu-dia/TuDia'

/**
 * /panel/inmobiliaria/pipeline/tu-dia — «Tu día»: a quién llamar hoy, con la llamada preparada, y las visitas de hoy.
 * Cuelga de Arrendamientos (módulo `pipeline`): también la tiene la cuenta gratis.
 */
export default function TuDiaPage() {
  return (
    <PageGuard module="pipeline" seccion="Tu día">
      <TuDia />
    </PageGuard>
  )
}
