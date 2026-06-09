'use client'

/**
 * /ai/conciliacion/[id] — F6: the Conciliación case detail (Detalle de caso).
 *
 * Thin page over the shared <WorkItemDetalle> body (extracted in F7 once
 * Estudio/Matching needed the same surface): reads
 * GET /ai-hub/work-items/conciliacion/{id} via useWorkItemDetail; actions post
 * via runWorkItemAction, refetch, then navigate back to the cola.
 */

import { useParams, useRouter } from 'next/navigation'
import { Bank } from '@phosphor-icons/react'

import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { WorkItemDetalle } from '@/components/inmobiliaria/ai/WorkItemDetalle'

const COLA_HREF = '/panel/inmobiliaria/ai/conciliacion/cola'

export default function ConciliacionCasoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable, refetch } = useWorkItemDetail('conciliacion', id)

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
      colaLabel="Cola de conciliación"
      icon={Bank}
      onAction={handleAction}
    />
  )
}
