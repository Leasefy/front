// Phase 32 plan 32-08 (COBR-UI-06) — payment plan approval route shell.
// Server component: wraps PaymentPlanApprovalClient in PageGuard module="cobranza".

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import PaymentPlanApprovalClient from './PaymentPlanApprovalClient'

export const metadata: Metadata = {
  title: 'Aprobar plan · Cobranza',
  description: 'Aprobar / rechazar / modificar un plan de pago propuesto por la IA',
}

export default async function PaymentPlanApprovalPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  return (
    <PageGuard module="cobranza" action="view">
      <PaymentPlanApprovalClient planId={planId} />
    </PageGuard>
  )
}
