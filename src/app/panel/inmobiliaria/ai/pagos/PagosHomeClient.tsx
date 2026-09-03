'use client'

/**
 * PagosHomeClient — Pagos IA Home (preview, flag-gated).
 *
 * Wires the 4 data-layer hooks (metrics / attention / payment-detail / owner-inbox)
 * into the 4 widgets. agencyId comes from useAuth(); the hooks stay idle (no spin)
 * until it resolves.
 *
 * Graceful degradation (the agent endpoints are not deployed yet):
 *   - metrics.disabled (503 'pagos_disabled') ⇒ single "feature off" info panel,
 *     NOT an error — widgets are not rendered.
 *   - per-widget loading ⇒ skeleton; error ⇒ inline retry; empty ⇒ EmptyState.
 *   - never a white screen / infinite spinner.
 *
 * Detail drawer: selecting an attention row sets `selectedInvoiceId`, which both
 * opens the Sheet and enables usePaymentDetail(agencyId, invoiceId).
 */

import { useCallback, useState } from 'react'
import { PlugsConnected } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import {
  useOwnerInbox,
  usePagosHomeAttention,
  usePagosHomeMetrics,
  usePaymentDetail,
} from '@/lib/hooks/pagos-home/use-pagos-home'

import { PagosHomeMetricsStrip } from '@/components/inmobiliaria/pagos/PagosHomeMetricsStrip'
import { PagosHomeAttentionList } from '@/components/inmobiliaria/pagos/PagosHomeAttentionList'
import { PagosHomeDetailPanel } from '@/components/inmobiliaria/pagos/PagosHomeDetailPanel'
import { PagosHomeOwnerInbox } from '@/components/inmobiliaria/pagos/PagosHomeOwnerInbox'

export function PagosHomeClient() {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  const metrics = usePagosHomeMetrics(agencyId)
  const attention = usePagosHomeAttention(agencyId)
  const ownerInbox = useOwnerInbox(agencyId)
  const detail = usePaymentDetail(agencyId, selectedInvoiceId)

  const handleSelect = useCallback((invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
  }, [])

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedInvoiceId(null)
  }, [])

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {t('inmobiliaria.ai.pagos_home.title')}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t('inmobiliaria.ai.pagos_home.subtitle')}
        </p>
      </header>

      {metrics.disabled ? (
        /* ── Feature off (503 'pagos_disabled') — info panel, not an error ── */
        <section
          role="status"
          className="rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-12 flex flex-col items-center gap-3 text-center"
        >
          <PlugsConnected className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            {t('inmobiliaria.ai.pagos_home.disabled.title')}
          </p>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            {t('inmobiliaria.ai.pagos_home.disabled.description')}
          </p>
        </section>
      ) : (
        <>
          {/* HOME-01 — metrics strip */}
          <PagosHomeMetricsStrip
            data={metrics.data}
            isLoading={metrics.isLoading}
            error={metrics.error}
            onRetry={metrics.refetch}
          />

          {/* HOME-02 + HOME-04 — attention + owner inbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PagosHomeAttentionList
              data={attention.data}
              isLoading={attention.isLoading}
              error={attention.error}
              onRetry={attention.refetch}
              onSelect={handleSelect}
              selectedInvoiceId={selectedInvoiceId}
            />
            <PagosHomeOwnerInbox
              data={ownerInbox.data}
              isLoading={ownerInbox.isLoading}
              error={ownerInbox.error}
              onRetry={ownerInbox.refetch}
            />
          </div>

          {/* HOME-03 — detail drawer */}
          <PagosHomeDetailPanel
            open={selectedInvoiceId !== null}
            onOpenChange={handleDrawerOpenChange}
            data={detail.data}
            isLoading={detail.isLoading}
            error={detail.error}
            onRetry={detail.refetch}
          />
        </>
      )}
    </main>
  )
}
