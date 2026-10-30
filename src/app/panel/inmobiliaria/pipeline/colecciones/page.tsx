import { PageGuard } from '@/components/auth/PageGuard'
import { Colecciones } from '@/components/inmobiliaria/colecciones/Colecciones'

/** /panel/inmobiliaria/pipeline/colecciones — las colecciones que el agente le manda a cada cliente (28-10-2026). */
export default function ColeccionesPage() {
  return (
    <PageGuard module="pipeline" seccion="Colecciones">
      <Colecciones />
    </PageGuard>
  )
}
