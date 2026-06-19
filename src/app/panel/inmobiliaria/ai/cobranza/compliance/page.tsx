'use client'

/**
 * Compliance Overview — Phase 34 plan 34-07 (D-34-03, D-34-07, D-34-RES-A1).
 *
 * 4 sections + page-level red banner + 3 sub-page nav cards.
 *
 * Banner trigger (D-34-RES-A1 + D-34-07): visible when ANY open Habeas Data
 * request has remaining_days <= 15. Since the server only ever returns OPEN
 * requests under a 15-day SLA window, this condition is effectively
 * "any open request exists" — but the explicit `<= 15` check stays for
 * clarity and to defend against future server changes.
 *
 * Refs mvp:docs/DESIGN.md §1 (sobrio + warm), §4 (cards rounded-xl border
 * bg-card), §11 (loading state spinner), mvp:docs/COLOR_SYSTEM.md
 * (rose for warning/error, emerald for ok).
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Warning, ShieldCheck, ClipboardText, FileText } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useComplianceOverview } from '@/lib/hooks/cobranza/use-compliance-overview'
import { HabeasDataSlaCard } from '@/components/inmobiliaria/cobranza/HabeasDataSlaCard'
import { ComplianceSparkline } from '@/components/inmobiliaria/cobranza/ComplianceSparkline'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'

function ComplianceOverviewContent() {
  const { t, locale } = useI18n()
  const { data, isLoading, error, refetch } = useComplianceOverview()

  // D-34-RES-A1 banner trigger — any open request meets the 15-day cutoff
  // by definition, but the explicit predicate stays for defense-in-depth.
  const showBanner = useMemo(() => {
    if (!data) return false
    return data.habeas_data.open_requests.some((r) => r.remaining_days <= 15)
  }, [data])

  const lastUpdated = useMemo(() => {
    if (!data?.generated_at) return null
    const sec = Math.max(
      0,
      Math.round((Date.now() - new Date(data.generated_at).getTime()) / 1000),
    )
    if (sec < 60) return locale.startsWith('es') ? `hace ${sec}s` : `${sec}s ago`
    const min = Math.round(sec / 60)
    return locale.startsWith('es') ? `hace ${min}m` : `${min}m ago`
  }, [data?.generated_at, locale])

  // Phase 38-05a: page-level skeleton during first load
  if (isLoading && !data) return <PageSkeleton variant="dashboard" />

  // Phase 38-05a: page-level EmptyState when no compliance issues at all
  // ("truly empty" = no open Habeas Data + no outside-hours violations)
  const hasAnyIssues =
    !!data &&
    (data.habeas_data.open_requests.length > 0 ||
      data.ley_2300.weekly_outside_hours_count > 0)
  if (!isLoading && data && !error && !hasAnyIssues) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t('inmobiliaria.ai.cobranza.compliance.empty.title')}
        description={t('inmobiliaria.ai.cobranza.compliance.empty.description')}
      />
    )
  }

  const subPages = [
    {
      href: '/panel/inmobiliaria/ai/cobranza/compliance/ley-2300',
      title: t('inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title'),
      Icon: ClipboardText,
    },
    {
      href: '/panel/inmobiliaria/ai/cobranza/compliance/opt-out',
      title: t('inmobiliaria.ai.cobranza.compliance.subPages.optOutTitle'),
      Icon: ShieldCheck,
    },
    {
      href: '/panel/inmobiliaria/ai/cobranza/compliance/audit',
      title: t('inmobiliaria.ai.cobranza.compliance.subPages.auditTitle'),
      Icon: FileText,
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 font-heading text-foreground">
            {t('inmobiliaria.ai.cobranza.compliance.pageTitle')}
          </h1>
          {lastUpdated && (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums font-mono">
              {lastUpdated}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm border border-border text-foreground hover:bg-muted active:scale-[0.97] transition font-medium"
          aria-label="refresh"
        >
          {locale.startsWith('es') ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {/* Page-level red banner — D-34-RES-A1 trigger remaining_days <= 15 */}
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-4 flex items-start gap-3"
          role="alert"
        >
          <Warning
            className="w-5 h-5 text-[#C4503B] dark:text-[#E0664D] flex-shrink-0 mt-0.5"
            weight="fill"
            aria-hidden="true"
          />
          <p className="text-sm text-[#C4503B] dark:text-[#E0664D]">
            {t('inmobiliaria.ai.cobranza.compliance.habeasData.banner')}
          </p>
        </motion.div>
      )}

      {/* Error state — color+icon+text (a11y: not color-only per XR-06) */}
      {error && !data && (
        <div
          role="alert"
          className="rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 border border-[#C4503B]/30 dark:border-[#C4503B]/40 p-3 text-sm text-[#C4503B] dark:text-[#E0664D] flex items-center gap-2"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>Error: {error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Section 1: Ley 2300 weekly counter */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.compliance.overview.ley2300Heading')}
            </h2>
            <div className="mt-3 flex items-baseline gap-3">
              <span
                className={[
                  'text-4xl font-mono tabular-nums',
                  data.ley_2300.weekly_outside_hours_count === 0
                    ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                    : 'text-[#C4503B] dark:text-[#E0664D] font-bold',
                ].join(' ')}
              >
                {data.ley_2300.weekly_outside_hours_count}
              </span>
              <span className="text-sm text-muted-foreground">
                / {data.ley_2300.target}
              </span>
            </div>
          </section>

          {/* Section 2: Habeas Data SLA list */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {t('inmobiliaria.ai.cobranza.compliance.overview.habeasDataHeading')}
              </h2>
              <Link
                href="/panel/inmobiliaria/ai/cobranza/compliance/opt-out"
                className="text-xs text-primary hover:underline font-medium"
              >
                {locale.startsWith('es') ? 'Ver todos' : 'View all'}
              </Link>
            </div>
            {data.habeas_data.open_requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {locale.startsWith('es')
                  ? 'Sin solicitudes Habeas Data abiertas'
                  : 'No open Habeas Data requests'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.habeas_data.open_requests.map((req) => (
                  <HabeasDataSlaCard key={req.id} request={req} />
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Retention gauge */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.compliance.overview.retentionHeading')}
            </h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-baseline gap-2">
                <span
                  className={[
                    'text-3xl font-mono tabular-nums',
                    data.retention.compliance_pct >= data.retention.target
                      ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                      : 'text-[#B7791F] dark:text-[#D2992F]',
                  ].join(' ')}
                >
                  {data.retention.compliance_pct}%
                </span>
                <span className="text-sm text-muted-foreground">
                  / {data.retention.target}%
                </span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={data.retention.compliance_pct}
              >
                <div
                  className={[
                    'h-full transition-all',
                    data.retention.compliance_pct >= data.retention.target
                      ? 'bg-[#2C7A53]'
                      : 'bg-[#B7791F]',
                  ].join(' ')}
                  style={{
                    width: `${Math.min(100, Math.max(0, data.retention.compliance_pct))}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Section 4: 30-day sparkline */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-3">
              {t('inmobiliaria.ai.cobranza.compliance.overview.sparklineHeading')}
            </h2>
            <ComplianceSparkline buckets={data.sparkline.daily_buckets_30d} />
          </section>

          {/* Section 5: Sub-page nav cards */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {subPages.map(({ href, title, Icon }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary hover:bg-accent/30 transition flex items-center gap-3"
              >
                <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{title}</span>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

export default function CompliancePage() {
  return (
    <PageGuard module="cobranza" action="view">
      <ComplianceOverviewContent />
    </PageGuard>
  )
}
