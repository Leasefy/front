// Phase 32 plan 32-07 (COBR-UI-05) — pagos funnel route shell.
// Server component: wraps PagosFunnelClient in PageGuard module="cobranza".

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import PagosFunnelClient from './PagosFunnelClient'

export const metadata: Metadata = {
  title: 'Pagos · Cobranza',
  description: 'Funnel de pagos y desembolsos',
}

export default function PagosFunnelPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <PagosFunnelClient />
      </Suspense>
    </PageGuard>
  )
}
