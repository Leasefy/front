'use client'

/**
 * [ticketId]/page.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Maintenance ticket DETAIL route. Mock-first: consumes `useMantenimientoTicket`
 * (07-01), which resolves mock data (no backend dashboard-read endpoints exist
 * yet — follow-up agent-side). Renders TicketDetail with loading / empty / error
 * guards mirroring cobranza/page.tsx. The breadcrumb + access gate are provided by
 * the `ai/mantenimiento/layout.tsx` (07-02) — not recreated here.
 *
 * CTA wiring: the hook's mock mutators are forwarded to TicketDetail. `onCerrar`
 * calls the hook's `close({ note })` — the hook enforces the FENCE-04 evidence gate
 * (a close with no evidence is a no-op), and the TicketCTAs Dialog already gated the
 * user's confirmation, so passing a confirmation note here is the wired evidence.
 *
 * i18n: `…detalle.errorLoading` (exists). The empty-state reuses `…inbox.empty`
 * (a dedicated `detalle.empty.*` key is NOT in the C7-03 tree — reported follow-up).
 */

import { useCallback } from 'react'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { useParams } from 'next/navigation'
import { Wrench } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/data-display/EmptyState'
import { useI18n } from '@/lib/i18n'
import { useMantenimientoTicket } from '@/lib/hooks/mantenimiento/use-mantenimiento-ticket'
import { TicketDetail } from '@/components/inmobiliaria/mantenimiento/TicketDetail'

const ROOT = 'inmobiliaria.ai.mantenimiento'

export default function MantenimientoTicketDetailPage() {
  const { t } = useI18n()
  const { ticketId } = useParams<{ ticketId: string }>()

  const { data, isLoading, error, assign, requestInfo, requestApproval, escalate, close } =
    useMantenimientoTicket(ticketId)

  // FENCE-04: the hook's close() requires evidence; the TicketCTAs Dialog already
  // gated the operator's confirmation, so we pass a confirmation note here.
  const handleCerrar = useCallback(() => {
    close({ note: 'Cierre confirmado por el asesor: el caso no procede.' })
  }, [close])

  if (isLoading && !data) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </main>
    )
  }

  if (!data && !isLoading && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={Wrench}
          title={t(`${ROOT}.inbox.empty`)}
          description={t(`${ROOT}.inbox.emptyFiltered`)}
        />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="p-6 lg:p-8">
        <AlertaAccionable severidad="danger" titulo={t(`${ROOT}.detalle.errorLoading`)}>
          {error ?? null}
        </AlertaAccionable>
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8">
      <TicketDetail
        detail={data}
        isBusy={isLoading}
        onAsignar={assign}
        onPedirInfo={requestInfo}
        onSolicitarAprobacion={requestApproval}
        onEscalar={escalate}
        onCerrar={handleCerrar}
      />
    </main>
  )
}
