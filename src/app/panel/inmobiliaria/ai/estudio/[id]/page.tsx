// Tier-B estudio UX — case detail route shell.
// Server component: resolves the dynamic [id] param (Next.js 15 async params)
// and wraps the client orchestrator in PageGuard module="estudio" (bare —
// defaults action="view"). MIRRORS cobranza/deudores/[id]/page.tsx.
//
// [id] is the tenant-scoring runId — passed through to the client which reads
// GET /tenant-scoring/:runId via useEstudioRun.

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import EstudioDetailClient from './EstudioDetailClient'

export const metadata: Metadata = {
  title: 'Estudio · Inquilino',
  description: 'Detalle del estudio de inquilino: decisión, indicadores, documentos, consistencia y racional',
}

interface PageProps {
  // Next.js 15: dynamic params are async-resolved.
  params: Promise<{ id: string }>
}

export default async function EstudioDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <PageGuard module="estudio">
      <EstudioDetailClient runId={id} />
    </PageGuard>
  )
}
