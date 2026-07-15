// Phase 31 plan 31-08 (COBR-UI-02) — deudores list route shell.
// Server component: wraps DeudoresListClient in PageGuard module="cobranza".

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import DeudoresListClient from './DeudoresListClient'

export const metadata: Metadata = {
  title: 'Deudores · Cobranza',
  description: 'Lista de deudores con filtros y búsqueda',
}

export default function DeudoresListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <DeudoresListClient />
    </PageGuard>
  )
}
