// Phase 31 plan 31-09 (COBR-UI-03, COBR-UI-14) — debtor detail route shell.
// Server component: resolves the dynamic [id] param and wraps the client
// orchestrator in PageGuard module="cobranza" action="view".
//
// The PIIRevealContextProvider wrap lives in DebtorDetailClient (client side)
// because the provider holds in-memory reveal-token state (D-31-06).

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import DebtorDetailClient from './DebtorDetailClient'

export const metadata: Metadata = {
  title: 'Deudor · Cobranza',
  description: 'Detalle del deudor con timeline, llamadas, memos, compromisos y acciones',
}

interface PageProps {
  // Next.js 15: dynamic params are async-resolved.
  params: Promise<{ id: string }>
}

export default async function DebtorDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <PageGuard module="cobranza" action="view">
      <DebtorDetailClient debtorId={id} />
    </PageGuard>
  )
}
