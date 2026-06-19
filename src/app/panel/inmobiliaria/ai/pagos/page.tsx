import { Suspense } from 'react'
import type { Metadata } from 'next'

import { PageGuard } from '@/components/auth/PageGuard'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'

import { PagosHomeClient } from './PagosHomeClient'

export const metadata: Metadata = {
  title: 'Pagos IA',
}

/**
 * Pagos IA Home — server page (preview, flag-gated).
 *
 * Permission gate: cobranza:view (same module the rest of the AI cobranza/pagos
 * surface uses). The client component owns all data fetching + graceful
 * degradation (feature-off / loading / error / empty).
 */
export default function PagosHomePage() {
  return (
    <PageGuard module="cobranza" action="view">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <PagosHomeClient />
      </Suspense>
    </PageGuard>
  )
}
