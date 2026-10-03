import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import CasoDetailClient from './CasoDetailClient'

export const metadata: Metadata = {
  title: 'Caso de retención · Laura',
  description: 'Perfil 360, plan de retención y mensaje para un propietario en riesgo.',
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
