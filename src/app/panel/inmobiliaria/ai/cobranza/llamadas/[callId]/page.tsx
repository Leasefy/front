// Phase 31 plan 31-10 (COBR-UI-04) — call detail route shell.
// Server component: resolves [callId] param, wraps CallDetailClient in PageGuard module="cobranza".

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import CallDetailClient from './CallDetailClient'

export const metadata: Metadata = {
  title: 'Llamada · Cobranza',
  description: 'Detalle de llamada de cobranza — replay, transcripción y QA',
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>
}) {
  const { callId } = await params
  return (
    <PageGuard module="cobranza" action="view">
      <CallDetailClient callId={callId} />
    </PageGuard>
  )
}
