// Phase 32 plan 32-07 (COBR-UI-05) — payment detail page.
//
// Wired 2026-06-17 to the cobranza-UX backend:
//   GET  /api/agency/{agencyId}/cobranza/pagos/{paymentId}  (detail, PII masked)
//   POST /api/agency/{agencyId}/cobranza/pagos/{paymentId}/verify  (human verify, T-323)
//
// The server component keeps PageGuard (module="cobranza" action="view") + the
// Suspense skeleton; the client component does the fail-soft fetch + the
// operator-confirmed "Verificar pago" action. If the backend isn't deployed
// (404 / unmigrated), the client degrades to the EmptyState fallback — the
// screen's prior locked state.

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import PaymentDetailClient from './PaymentDetailClient'

export const metadata: Metadata = {
  title: 'Pago · Cobranza',
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>
}) {
  const { paymentId } = await params
  return (
    <PageGuard module="cobranza" action="view">
      <Suspense fallback={<PageSkeleton variant="detail" />}>
        <PaymentDetailClient paymentId={paymentId} />
      </Suspense>
    </PageGuard>
  )
}
