import { PageGuard } from '@/components/auth/PageGuard'
import { ResenasDelPanel } from '@/components/inmobiliaria/resenas/ResenasDelPanel'

/** /panel/inmobiliaria/pipeline/resenas — las reseñas de tus clientes, para leerlas y responderlas (28-10-2026). */
export default function ResenasPage() {
  return (
    <PageGuard module="pipeline" seccion="Reseñas">
      <ResenasDelPanel />
    </PageGuard>
  )
}
