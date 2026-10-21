'use client'

import { PageTransition } from '@/components/providers/PageTransition'

/**
 * Transición entre pantallas del admin, la misma del panel de la inmobiliaria:
 * el contenido entra con fundido y sube 8 px; la barra y la cabecera quedan
 * quietas (viven en el layout).
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
