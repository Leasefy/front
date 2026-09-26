import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import CasoDetailClient from './CasoDetailClient'

export const metadata: Metadata = {
  title: 'Caso de retención · Vinci',
  description: 'Por qué está en riesgo, las ofertas, el plan y lo que Vinci hizo.',
}

interface PageProps {
  params: Promise<{ caseId: string }>
}

export default async function CasoDetailPage({ params }: PageProps) {
  const { caseId } = await params
  return (
    <PageGuard module="retencion" action="view">
      <CasoDetailClient caseId={decodeURIComponent(caseId)} />
    </PageGuard>
  )
}
