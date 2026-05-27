// Phase 32 plan 32-07 (COBR-UI-05) — pagos funnel route shell.
// Server component: wraps PagosFunnelClient in PageGuard module="cobranza".

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import PagosFunnelClient from './PagosFunnelClient'

export const metadata: Metadata = {
  title: 'Pagos · Cobranza',
  description: 'Funnel de pagos y desembolsos',
}

export default function PagosFunnelPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <Suspense
        fallback={
          <div className="p-4 lg:p-8 text-sm text-neutral-500 dark:text-neutral-400">Cargando…</div>
        }
      >
        <PagosFunnelClient />
      </Suspense>
    </PageGuard>
  )
}
