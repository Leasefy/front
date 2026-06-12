import { Metadata } from 'next'
import { ForceLightMode } from '@/components/providers/ForceLightMode'

export const metadata: Metadata = {
  title: 'Pre-aprobación instantánea | Leasefy',
  description:
    'Consulta en segundos qué aseguradora te afianza para tu próximo arriendo. Un asesor te acompaña en el proceso.',
}

export default function PreaprobacionLayout({ children }: { children: React.ReactNode }) {
  return <ForceLightMode>{children}</ForceLightMode>
}
