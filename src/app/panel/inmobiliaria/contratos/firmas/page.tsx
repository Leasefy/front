import { PageGuard } from '@/components/auth/PageGuard'
import { ROLES_DE_CONTRATOS } from '@/lib/contratos/roles-de-contratos'

import { FirmasClient } from './FirmasClient'

/**
 * /panel/inmobiliaria/contratos/firmas — A-13: la invitación a firmar vence a
 * los 7 días con dos recordatorios, vuelve a borrador y avisa al asesor SIN
 * liberar el inmueble.
 */
export default function FirmasPage() {
  return (
    <PageGuard module="contratos" roles={ROLES_DE_CONTRATOS}>
      <FirmasClient />
    </PageGuard>
  )
}
