/**
 * page.tsx — la pestaña «Qué dice Naira de mí» del workspace de Naira (P3, Nico 15-10-2026; concepto B-5 §4). Todos los
 * roles la ven (es lo suyo); el dueño, el admin y el gerente además eligen la ficha de quien autorizó.
 */

import { PageGuard } from '@/components/auth/PageGuard'

import { DeMiClient } from './DeMiClient'

export default function NairaDeMiPage() {
  return (
    <PageGuard module="naira" action="notify-preferences-edit">
      <DeMiClient />
    </PageGuard>
  )
}
