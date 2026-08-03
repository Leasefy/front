import { Metadata } from 'next'
import { ForceLightMode } from '@/components/providers/ForceLightMode'

export const metadata: Metadata = {
  title: 'Tu avalúo · Leasefy IA',
  description: 'El avalúo de tu inmueble, preparado con Leasefy IA.',
}

/**
 * Owner-facing report shell — standalone, light, no panel chrome. This is what
 * the property owner opens from the WhatsApp/email link.
 */
export default function ReporteAvaluoLayout({ children }: { children: React.ReactNode }) {
  return <ForceLightMode>{children}</ForceLightMode>
}
