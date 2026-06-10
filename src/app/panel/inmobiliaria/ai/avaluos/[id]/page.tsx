'use client'

/**
 * /ai/avaluos/[id] — the Avalúos case detail (read-only tracking).
 *
 * Thin page over the shared <WorkItemDetalle> body: reads
 * GET /ai-hub/work-items/avaluos/{id} via useWorkItemDetail. Avalúos items
 * carry `actions: []` by design (la firma del certificado la hacen
 * Portofino/Leasefy en el backoffice admin), so the action handler exists
 * only to satisfy the generic contract — the backend never surfaces actions
 * here. No crossLink: solicitar un nuevo avalúo vive en el CTA de la Sala.
 */

import { useParams, useRouter } from 'next/navigation'
import { Scales } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { WorkItemDetalle } from '@/components/inmobiliaria/ai/WorkItemDetalle'
import { useI18n } from '@/lib/i18n'

const COLA_HREF = '/panel/inmobiliaria/ai/avaluos/cola'

function AvaluosCaso() {
  const router = useRouter()
  const { t } = useI18n()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable } = useWorkItemDetail('avaluos', id)

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
      colaLabel={t('inmobiliaria.ai.workspace.pages.avaluos.casoColaLabel')}
      icon={Scales}
      onAction={handleAction}
    />
  )
}

export default function AvaluosCasoPage() {
  return (
    <PageGuard module="avaluos">
      <AvaluosCaso />
    </PageGuard>
  )
}
