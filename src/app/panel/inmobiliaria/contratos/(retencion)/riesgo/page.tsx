import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import BandejaClient from './BandejaClient'

export const metadata: Metadata = {
  title: 'Riesgo · Retención',
  description: 'Propietarios e inmuebles priorizados por riesgo de salida del portafolio.',
}

export default function BandejaPage() {
  return (
    <PageGuard module="retencion" action="view">
      <BandejaClient />
    </PageGuard>
  )
}
