'use client'

import { useParams } from 'next/navigation'

import { DetalleDelAgente } from '../DetalleDelAgente'

/**
 * /admin/agents/:id — el agente en su propia página, para los enlaces directos (FRONT.md §6.3 · BACK.md
 * §8.2). Desde la lista se abre en un cajón ancho (ronda 26); las dos usan `DetalleDelAgente`.
 */
export default function AgentDetailPage() {
  const params = useParams<{ id: string }>()
  return <DetalleDelAgente id={params.id} />
}
