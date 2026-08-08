import { Metadata } from 'next'
import { ForceLightMode } from '@/components/providers/ForceLightMode'

export const metadata: Metadata = {
  title: 'Aprobación de arriendo | Leasefy',
  description:
    'Descubre en segundos hasta cuánto te podemos arrendar. Consultamos varias aseguradoras a la vez.',
}

export default function AprobacionLayout({ children }: { children: React.ReactNode }) {
  return <ForceLightMode>{children}</ForceLightMode>
}
