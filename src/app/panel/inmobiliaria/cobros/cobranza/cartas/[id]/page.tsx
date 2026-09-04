// Phase 32 plan 32-09 (COBR-UI-08) — pre-judicial letter approval route shell.
// Server component: wraps CartaApprovalClient in PageGuard module="cobranza".

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import CartaApprovalClient from './CartaApprovalClient'

export const metadata: Metadata = {
  title: 'Aprobar carta · Cobranza',
  description: 'Aprobar / rechazar una carta prejurídica propuesta por la IA',
}

export default async function CartaApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <PageGuard module="cobranza" action="view">
      <CartaApprovalClient artifactId={id} />
    </PageGuard>
  )
}
