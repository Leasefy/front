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

import { PageGuard } from '@/components/auth/PageGuard'
import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { WorkItemDetalle } from '@/components/inmobiliaria/ai/WorkItemDetalle'

const COLA_HREF = '/panel/inmobiliaria/ai/matching/cola'

function MatchingCaso() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable } = useWorkItemDetail('matching', id)

  async function handleAction(action: WorkItemAction, body?: Record<string, unknown>) {
    const res = await runWorkItemAction(action, body)
    if (res.ok) {
      // Navigate first — refetching here 404-flashes once the item leaves the
      // queue; the cola self-fetches fresh on mount.
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

export default function MatchingCasoPage() {
  return (
    <PageGuard module="matching">
      <MatchingCaso />
    </PageGuard>
  )
}
