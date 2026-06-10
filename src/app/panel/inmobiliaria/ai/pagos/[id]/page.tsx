'use client'

/**
 * /ai/pagos/[id] — F9: the Pagos (AP) case detail.
 *
 * Thin page over the shared <WorkItemDetalle> body: reads
 * GET /ai-hub/work-items/pagos/{id} via useWorkItemDetail; actions post via
 * runWorkItemAction (the EXISTING AP triple-gate endpoints), refetch, then
 * navigate back to the cola. Until the backend pagos detail resolver ships
 * this renders the graceful notAvailable state — by design.
 *
 * Cross-link: the pagos WorkItem id IS the VendorBill id (pagos-adapter maps
 * 1:1), so "Tesorería · AP" deep-links into the real bill detail at
 * /tesoreria/ap/[id].
 */

import { useParams, useRouter } from 'next/navigation'
import { CurrencyDollar } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { WorkItemDetalle } from '@/components/inmobiliaria/ai/WorkItemDetalle'

const COLA_HREF = '/panel/inmobiliaria/ai/pagos/cola'

function PagosCaso() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable } = useWorkItemDetail('pagos', id)

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
      colaLabel="Cola de pagos"
      icon={CurrencyDollar}
      onAction={handleAction}
      crossLink={{
        pregunta: '¿Ver la factura en Tesorería?',
        destino: 'Tesorería · AP',
        href: `/panel/inmobiliaria/tesoreria/ap/${id}`,
      }}
    />
  )
}

export default function PagosCasoPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosCaso />
    </PageGuard>
  )
}
