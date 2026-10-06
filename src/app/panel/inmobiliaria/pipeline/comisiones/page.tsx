import { PageGuard } from '@/components/auth/PageGuard'
import { ComisionesYMetas } from '@/components/comercial/ComisionesYMetas'

/**
 * /panel/inmobiliaria/pipeline/comisiones — «Comisiones y metas» (COMERCIAL,
 * Nico 04-10-2026): «Mi comisión del mes» para el asesor; la de todos, la
 * exportación para nómina y las metas para el gerente. Cuelga del módulo
 * `agentes`, el mismo que exige el back (`GET /inmobiliaria/comercial/*`) y
 * que el asesor comercial ya tiene.
 */
export default function ComisionesYMetasPage() {
  return (
    <PageGuard module="agentes" seccion="Comisiones y metas">
      <ComisionesYMetas />
    </PageGuard>
  )
}
