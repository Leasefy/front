import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import RevisionesClient from './RevisionesClient'

export const metadata: Metadata = {
  title: 'Por aprobar · Retención',
  description: 'Revisa las decisiones autónomas tomadas por Laura (T-323).',
}

export default function RevisionesPage() {
  return (
    <PageGuard module="retencion" action="view">
      <RevisionesClient />
    </PageGuard>
  )
}
