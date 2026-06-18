'use client'

/**
 * Siniestros list page — Task 1 (H21 QA fix).
 *
 * Displays the agency-level list of insurance claims using
 * GET /api/agency/{agencyId}/cartera/insurance-claims (listCarteraInsuranceClaims).
 *
 * Pattern matches: deudores/DeudoresListClient + cartas/page conventions.
 * Refs DESIGN.md §1 (sobrio + warm), §4 (cards rounded-xl + shadow),
 * §11 (loading skeleton), §16 (tabular-nums).
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowClockwise, Siren, Warning } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui'
import { Chip } from '@leasefy/ui'
import {
  useInsuranceClaims,
  type InsuranceClaimStatus,
} from '@/lib/hooks/cobranza/use-insurance-claims'

// ── Status badge colours — tokens semánticos del DS (contrato §8) ─────────────
function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'pending_human_review':
      return 'bg-warning-soft text-warning ring-1 ring-warning/30'
    case 'draft':
      return 'bg-muted text-muted-foreground ring-1 ring-border'
    case 'filed':
      return 'bg-primary-soft text-primary ring-1 ring-primary/30'
    case 'accepted':
      return 'bg-success-soft text-success ring-1 ring-success/30'
    case 'rejected':
    default:
      return 'bg-danger-soft text-danger ring-1 ring-danger/30'
  }
}

const STATUS_OPTIONS: InsuranceClaimStatus[] = [
  'pending_human_review',
  'draft',
  'filed',
  'accepted',
  'rejected',
]

const STATUS_LABELS: Record<InsuranceClaimStatus, { es: string; en: string }> = {
  pending_human_review: { es: 'Pendiente revisión', en: 'Pending review' },
  draft: { es: 'Borrador', en: 'Draft' },
  filed: { es: 'Radicado', en: 'Filed' },
  accepted: { es: 'Aceptado', en: 'Accepted' },
  rejected: { es: 'Rechazado', en: 'Rejected' },
}

function SiniestrosContent() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const isEs = locale.startsWith('es')

  const [statusFilter, setStatusFilter] = useState<InsuranceClaimStatus | undefined>()

  const { data, isLoading, error, refetch } = useInsuranceClaims({
    status: statusFilter,
  })

  const navigateToSiniestro = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/ai/cobranza/siniestros/${id}`)
    },
    [router],
  )

  const claims = data?.claims ?? []
  const hasFilters = statusFilter !== undefined

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <main className="p-4 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <header className="mb-5">
          <div className="h-7 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mt-2" />
        </header>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 animate-pulse">
              {Array.from({ length: 6 }, (_, i) => (
                <tr key={`skel-${i}`}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    )
  }

  // ── Global empty state (no filters, no data) ──────────────────────────────
  if (!isLoading && !hasFilters && claims.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={Siren}
          title={t('inmobiliaria.ai.cobranza.siniestros.list.empty.title')}
          description={t('inmobiliaria.ai.cobranza.siniestros.list.empty.description')}
        />
      </main>
    )
  }

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.siniestros.list.pageTitle')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.siniestros.list.pageSubtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => void refetch()}
          aria-label={isEs ? 'Actualizar' : 'Refresh'}
          className="shrink-0"
        >
          <ArrowClockwise className="w-3.5 h-3.5" aria-hidden="true" />
          {isEs ? 'Actualizar' : 'Refresh'}
        </Button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <fieldset>
          <legend className="sr-only">{isEs ? 'Estado del siniestro' : 'Claim status'}</legend>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Chip
                key={s}
                size="sm"
                selected={statusFilter === s}
                onClick={() => setStatusFilter((prev) => (prev === s ? undefined : s))}
              >
                {STATUS_LABELS[s][isEs ? 'es' : 'en']}
              </Chip>
            ))}
          </div>
        </fieldset>

        {hasFilters && (
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={() => setStatusFilter(undefined)}
            className="self-center px-0 h-auto"
          >
            {isEs ? 'Limpiar filtro' : 'Clear filter'}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center gap-2 mb-4"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-950/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.aseguradora')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.status')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.createdAt')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.filedAt')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.approvedBy')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {claims.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {isEs
                      ? 'Sin siniestros con el filtro seleccionado.'
                      : 'No claims match the selected filter.'}
                  </p>
                </td>
              </tr>
            )}
            {claims.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigateToSiniestro(c.id)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateToSiniestro(c.id)
                }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <td className="px-3 py-2 text-neutral-900 dark:text-white capitalize whitespace-nowrap">
                  {c.aseguradora}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                      statusBadgeClasses(c.status)
                    }
                  >
                    {isEs
                      ? (STATUS_LABELS[c.status as InsuranceClaimStatus]?.es ?? c.status)
                      : (STATUS_LABELS[c.status as InsuranceClaimStatus]?.en ?? c.status)}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums whitespace-nowrap">
                  {c.filedAt
                    ? new Date(c.filedAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {c.approvedByHumanUserId ? c.approvedByHumanUserId.slice(0, 8) + '…' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function SiniestrosListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <SiniestrosContent />
    </PageGuard>
  )
}
