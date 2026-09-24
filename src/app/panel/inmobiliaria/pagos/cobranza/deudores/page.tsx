// Phase 31 plan 31-08 (COBR-UI-02) — deudores list route shell.
// Server component: wraps DeudoresListClient in PageGuard module="cobranza".

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import DeudoresListClient from './DeudoresListClient'

// «Casos», igual que el sidebar, la pestaña y la miga de pan. La ruta sigue
// siendo /deudores porque cambiarla rompería los enlaces guardados y el detalle
// (/deudores/[id]); el nombre que se ve es lo que tiene que coincidir.
export const metadata: Metadata = {
  title: 'Casos · Cobranza',
  description: 'Cartera en curso, con filtros y búsqueda',
}

export default function DeudoresListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <DeudoresListClient />
    </PageGuard>
  )
}
