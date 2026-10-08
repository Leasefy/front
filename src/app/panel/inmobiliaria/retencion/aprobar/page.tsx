import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import RevisionesClient from './RevisionesClient'

export const metadata: Metadata = {
  title: 'Por aprobar · Retención',
  description: 'Lo que Vinci dejó esperando tu clic (T-323).',
}

export default function RevisionesPage() {
  return (
    <PageGuard module="retencion" action="view">
      <RevisionesClient />
    </PageGuard>
  )
}
