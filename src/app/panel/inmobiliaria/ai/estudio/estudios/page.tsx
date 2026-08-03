// Tier-B estudio UX — list/inbox route shell (build-kit §5).
// Server component: wraps EstudiosListClient in PageGuard module="estudio".
// Mirrors src/app/panel/inmobiliaria/ai/cobranza/deudores/page.tsx.

import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import EstudiosListClient from './EstudiosListClient'

export const metadata: Metadata = {
  title: 'Estudios · Estudio del inquilino',
  description: 'Bandeja de estudios de inquilino con filtros y búsqueda',
}

export default function EstudiosListPage() {
  return (
    <PageGuard module="estudio">
      <EstudiosListClient />
    </PageGuard>
  )
}
