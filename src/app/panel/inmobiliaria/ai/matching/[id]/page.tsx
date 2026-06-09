'use client'

/**
 * /ai/matching/[id] — F8: the Matching case detail.
 *
 * Thin page over the shared <WorkItemDetalle> body: reads
 * GET /ai-hub/work-items/matching/{id} via useWorkItemDetail; actions post
 * via runWorkItemAction, refetch, then navigate back to the cola. Soft
 * cross-link: "¿Es confiable este candidato?" → Estudio del inquilino.
 */

import { useParams, useRouter } from 'next/navigation'
import { GitMerge } from '@phosphor-icons/react'

import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { WorkItemDetalle } from '@/components/inmobiliaria/ai/WorkItemDetalle'

const COLA_HREF = '/panel/inmobiliaria/ai/matching/cola'

export default function MatchingCasoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable, refetch } = useWorkItemDetail('matching', id)

  async function handleAction(action: WorkItemAction, body?: Record<string, unknown>) {
    const res = await runWorkItemAction(action, body)
    if (res.ok) {
      // Refresh the detail (estado/traza change) and return to the cola.
      await refetch()
      router.push(COLA_HREF)
    }
    return res
  }

  return (
    <WorkItemDetalle
      data={data}
      isLoading={isLoading}
      error={error}
      notAvailable={notAvailable}
      colaHref={COLA_HREF}
      colaLabel="Cola de matching"
      icon={GitMerge}
      onAction={handleAction}
      crossLink={{
        pregunta: '¿Es confiable este candidato?',
        destino: 'Estudio del inquilino',
        href: '/panel/inmobiliaria/ai/estudio',
      }}
    />
  )
}
