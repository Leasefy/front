'use client'

/**
 * /ai/estudio/[id] — F7: the Estudio del inquilino case detail.
 *
 * Thin page over the shared <WorkItemDetalle> body: reads
 * GET /ai-hub/work-items/estudio/{id} via useWorkItemDetail; actions post via
 * runWorkItemAction, refetch, then navigate back to the cola. Estudio items
 * carry the `t323` flag — the header pill renders it via the shared FLAG_META
 * vocabulary. Soft cross-link: "¿Qué propiedad le calza?" → Matching.
 */

import { useParams, useRouter } from 'next/navigation'
import { ShieldCheck } from '@phosphor-icons/react'

import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { WorkItemDetalle } from '@/components/inmobiliaria/ai/WorkItemDetalle'

const COLA_HREF = '/panel/inmobiliaria/ai/estudio/cola'

export default function EstudioCasoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable, refetch } = useWorkItemDetail('estudio', id)

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
      colaLabel="Cola de estudio"
      icon={ShieldCheck}
      onAction={handleAction}
      crossLink={{
        pregunta: '¿Qué propiedad le calza?',
        destino: 'Workspace de Matching',
        href: '/panel/inmobiliaria/ai/matching',
      }}
    />
  )
}
