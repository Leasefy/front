import { PageGuard } from '@/components/auth/PageGuard'

import { RequisitosClient } from './RequisitosClient'

/**
 * /panel/inmobiliaria/postulaciones/requisitos — F-05: «los requisitos por tipo
 * de inquilino LOS DEFINE CADA INMOBILIARIA».
 *
 * Se lee con `pipeline` (el asesor tiene que poder saber qué papeles pedirle al
 * candidato) y se EDITA con `configuracion:edit`, que es lo que el cliente
 * verifica en pantalla y el back exige de nuevo en cada endpoint de escritura.
 */
export default function RequisitosPage() {
  return (
    <PageGuard module="pipeline">
      <RequisitosClient />
    </PageGuard>
  )
}
