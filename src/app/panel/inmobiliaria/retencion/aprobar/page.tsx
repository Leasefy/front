import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import RevisionesClient from './RevisionesClient'

export const metadata: Metadata = {
  title: 'Por aprobar · Retención',
  description: 'Revisa las decisiones que tomó sola Retención.',
}

export default function RevisionesPage() {
  return (
    <PageGuard module="retencion" action="view">
      <RevisionesClient />
    </PageGuard>
  )
}
