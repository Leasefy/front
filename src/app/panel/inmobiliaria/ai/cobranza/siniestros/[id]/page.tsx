// Phase 32 plan 32-09 (COBR-UI-07) — siniestro approval route shell.
// Server component: wraps SiniestroApprovalClient in PageGuard module="cobranza".

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import SiniestroApprovalClient from './SiniestroApprovalClient'

export const metadata: Metadata = {
  title: 'Aprobar siniestro · Cobranza',
  description: 'Aprobar / rechazar la radicación de un siniestro propuesto por la IA',
}

export default async function SiniestroApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <PageGuard module="cobranza" action="view">
      <SiniestroApprovalClient claimId={id} />
    </PageGuard>
  )
}
