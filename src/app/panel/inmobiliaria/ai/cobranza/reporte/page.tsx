'use client'

/**
 * Daily Report Viewer — Phase 34 plan 34-08.
 *
 * Layout:
 *   1. Header with report_date + last-refreshed timestamp
 *   2. KPI tile row (3 cards, threshold-coloring against active version)
 *   3. Alert banners (one per data.alerts entry)
 *   4. Top-N debtors table (N from thresholds.top_n_debtors_in_report)
 *   5. 30-day history table (cursor paginated)
 *   6. "Exportar CSV" button → downloadHistoryCsv() blob helper
 *
 * Performance: performance.mark + performance.measure exposed so 34-09
 * Playwright can assert <2s p95 render. Mark fires before first SWR fetch;
 * measure fires when `data` first becomes non-null.
 *
 * Refs:
 *   mvp:docs/DESIGN.md §1 (sobrio + warm, no raw Tailwind colors that bypass
 *     the scales), §4 (cards rounded-xl border bg-card), §11
 *     (loading spinner), §16 (numeric tabular-nums + font-mono)
 *   mvp:docs/COLOR_SYSTEM.md (rose=error, amber=warn, emerald=ok)
 *   34-CONTEXT.md D-34-04 (1h cache TTL), D-34-06 (per-user opt-in)
 */

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Warning, Download, GearSix, BellRinging, CalendarBlank, ArrowRight } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { formatRelativeTime } from '@/lib/format'
import { useAuth } from '@/lib/auth'
import { useDailyReport, useDailyReportHistory, downloadHistoryCsv } from '@/lib/hooks/cobranza/use-daily-report'
import { useThresholds } from '@/lib/hooks/cobranza/use-thresholds'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { CobranzaReporteSkeleton } from '@/components/skeleton/panel/CobranzaReporteSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const RENDER_START_MARK = 'reporte:render-start'
const RENDER_FIRST_PAINT_MARK = 'reporte:first-paint'
const RENDER_MEASURE = 'reporte:render'

function ReporteViewerContent() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const navigateToDebtor = (debtorId: string) => {
    router.push(`/panel/inmobiliaria/ai/cobranza/deudores/${debtorId}`)
  }

  // Mark render-start once at mount (before first SWR settle)
  useEffect(() => {
    if (typeof performance === 'undefined') return
    try {
      performance.mark(RENDER_START_MARK)
    } catch {
      /* ignore */
    }
  }, [])

  const { data, isLoading, error, refetch } = useDailyReport()
  const { active: thresholds } = useThresholds()
  const {
    items: history,
    isLoading: historyLoading,
    isLoadingMore: historyLoadingMore,
    hasMore: historyHasMore,
    loadMore: historyLoadMore,
  } = useDailyReportHistory(30)

  // Mark first-paint once data first arrives
  useEffect(() => {
    if (!data || typeof performance === 'undefined') return
    try {
      performance.mark(RENDER_FIRST_PAINT_MARK)
      performance.measure(RENDER_MEASURE, RENDER_START_MARK, RENDER_FIRST_PAINT_MARK)
    } catch {
      /* ignore — marks may not exist if SSR collapsed the mount */
    }
  }, [data])

  // Defaults match RESEARCH §1.6 / 34-05 DEFAULTS — used until thresholds load
  const pkrAlertBelow = thresholds?.pkr_pct_alert_below ?? 80
  const morosidadAlertAbove = thresholds?.indice_morosidad_pct_alert_above ?? 12
  const callsOutsideCritical = thresholds?.calls_outside_window_critical_at_least ?? 1
  const topN = thresholds?.top_n_debtors_in_report ?? 3

  const pkrValue = useMemo(() => {
    if (!data) return null
    return data.summary.pkr_pct ?? data.summary.pkr_7d_pct ?? null
  }, [data])

  const morosidadValue = data?.summary.indice_morosidad_pct ?? null
  const callsOutside = data?.summary.calls_outside_window_count ?? null

  const onExportCsv = async () => {
    if (!agencyId) return
    try {
      await downloadHistoryCsv(agencyId)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[reporte] CSV download failed', err)
    }
  }

  // ── Skeleton + EmptyState guards (Phase 38 plan 38-04a / D-38-04) ─────────
  // Skeleton during first-load (covers report data load; thresholds loads with it).
  // EmptyState when report data is genuinely absent and no error.
  if (isLoading && !data) return <CobranzaReporteSkeleton />

  if (!isLoading && !data && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={CalendarBlank}
          title={t('inmobiliaria.ai.cobranza.reporte.empty.title')}
          description={t('inmobiliaria.ai.cobranza.reporte.empty.description')}
          primaryCta={{
            label: t('inmobiliaria.ai.cobranza.reporte.empty.cta.label'),
            href: '/panel/inmobiliaria/ai/cobranza/reporte/suscripcion',
          }}
        />
      </main>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 font-heading text-foreground">
            {t('inmobiliaria.ai.cobranza.reporte.pageTitle')}
          </h1>
          {data?.report_date && (
            <p className="mt-1 text-xs font-mono tabular-nums text-muted-foreground">
              {data.report_date}
              {data.computed_at && (
                <span className="ml-2 text-muted-foreground/70">
                  · {new Date(data.computed_at).toLocaleString(locale)}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/panel/inmobiliaria/ai/cobranza/reporte/suscripcion"
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm border border-border text-foreground hover:bg-muted transition font-medium"
          >
            <BellRinging className="w-3.5 h-3.5" aria-hidden="true" />
            {locale.startsWith('es') ? 'Suscripción' : 'Subscription'}
          </Link>
          <Link
            href="/panel/inmobiliaria/ai/cobranza/reporte/thresholds"
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm border border-border text-foreground hover:bg-muted transition font-medium"
          >
            <GearSix className="w-3.5 h-3.5" aria-hidden="true" />
            {locale.startsWith('es') ? 'Umbrales' : 'Thresholds'}
          </Link>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm border border-border text-foreground hover:bg-muted active:scale-[0.97] transition font-medium"
            aria-label="refresh"
          >
            {locale.startsWith('es') ? 'Actualizar' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && !data && (
        <div className="rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 border border-[#C4503B]/30 dark:border-[#C4503B]/40 p-3 text-sm text-[#C4503B] dark:text-[#E0664D]">
          Error: {error}
        </div>
      )}

      {data && (
        <>
          {/* 1. KPI tile row */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiTile
              label={t('inmobiliaria.ai.cobranza.reporte.kpis.pkr')}
              value={pkrValue != null ? `${pkrValue.toFixed(1)}%` : '—'}
              alert={pkrValue != null && pkrValue < pkrAlertBelow}
            />
            <KpiTile
              label={t('inmobiliaria.ai.cobranza.reporte.kpis.morosidad')}
              value={morosidadValue != null ? `${morosidadValue.toFixed(1)}%` : '—'}
              alert={morosidadValue != null && morosidadValue > morosidadAlertAbove}
            />
            <KpiTile
              label={t('inmobiliaria.ai.cobranza.reporte.kpis.outsideHours')}
              value={callsOutside != null ? String(callsOutside) : '—'}
              alert={callsOutside != null && callsOutside >= callsOutsideCritical}
            />
          </section>

          {/* 2. Alert banners */}
          {data.alerts.length > 0 && (
            <section className="space-y-2">
              {data.alerts.map((alert, idx) => (
                <motion.div
                  key={`${alert.kpi}-${idx}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={[
                    'rounded-xl border p-3 flex items-start gap-3',
                    alert.severity === 'critical'
                      ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15'
                      : 'border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15',
                  ].join(' ')}
                  role="alert"
                >
                  <Warning
                    className={[
                      'w-4 h-4 flex-shrink-0 mt-0.5',
                      alert.severity === 'critical'
                        ? 'text-[#C4503B] dark:text-[#E0664D]'
                        : 'text-[#B7791F] dark:text-[#D2992F]',
                    ].join(' ')}
                    weight="fill"
                    aria-hidden="true"
                  />
                  <p
                    className={[
                      'text-xs font-mono tabular-nums',
                      alert.severity === 'critical'
                        ? 'text-[#C4503B] dark:text-[#E0664D]'
                        : 'text-[#B7791F] dark:text-[#D2992F]',
                    ].join(' ')}
                  >
                    {alert.kpi}: {String(alert.actual)} (
                    {locale.startsWith('es') ? 'umbral' : 'threshold'}{' '}
                    {String(alert.threshold)})
                  </p>
                </motion.div>
              ))}
            </section>
          )}

          {/* 3. Top-N debtors */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {t('inmobiliaria.ai.cobranza.reporte.topDebtors.heading')} · Top {topN}
              </h2>
            </div>
            {data.top_debtors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('inmobiliaria.ai.cobranza.reporte.topDebtors.empty')}
              </p>
            ) : (
              <div className="overflow-x-auto overscroll-contain">
              <table className="w-full text-sm">
                <thead className="bg-muted/10 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      {locale.startsWith('es') ? 'Deudor' : 'Debtor'}
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      DPD
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      {locale.startsWith('es') ? 'Saldo' : 'Balance'}
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      {locale.startsWith('es') ? 'Último contacto' : 'Last contact'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_debtors.slice(0, topN).map((d) => {
                    // Per-client narrative (additive — each sub-part hides when its field is null/absent).
                    const nextStepLabel = d.next_step?.label ?? null
                    const nextStepReason = d.next_step?.reason ?? null
                    const attemptsTotal = d.attempts?.total ?? null
                    const attemptsLastContact = d.attempts?.last_contact_at ?? null
                    const lastInteraction = d.last_interaction ?? null
                    const hasNarrative =
                      nextStepLabel != null ||
                      nextStepReason != null ||
                      attemptsTotal != null ||
                      lastInteraction != null
                    return (
                      <tr
                        key={d.debtor_id}
                        onClick={() => navigateToDebtor(d.debtor_id)}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigateToDebtor(d.debtor_id)
                        }}
                        aria-label={
                          locale.startsWith('es')
                            ? 'Ver expediente del deudor'
                            : 'View debtor expediente'
                        }
                        className="group border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40 transition-colors"
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-2">
                            <Mask
                              field="cedula"
                              value={d.debtor_id_masked ?? d.debtor_id}
                              onReveal={undefined}
                            />
                            <ArrowRight
                              className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-hidden="true"
                            />
                          </div>
                          {/* Per-client narrative — rendered additively under the debtor cell. */}
                          {hasNarrative && (
                            <div className="mt-1.5 space-y-1">
                              {nextStepLabel && (
                                <p className="text-xs text-foreground">
                                  <span className="font-medium">{nextStepLabel}</span>
                                  {nextStepReason && (
                                    <span className="text-muted-foreground">
                                      {' · '}
                                      {nextStepReason}
                                    </span>
                                  )}
                                </p>
                              )}
                              {attemptsTotal != null && (
                                <p className="text-xs text-muted-foreground">
                                  {attemptsTotal}{' '}
                                  {locale.startsWith('es')
                                    ? attemptsTotal === 1
                                      ? 'intento'
                                      : 'intentos'
                                    : attemptsTotal === 1
                                      ? 'attempt'
                                      : 'attempts'}
                                  {attemptsLastContact && (
                                    <span>
                                      {' · '}
                                      {locale.startsWith('es')
                                        ? 'último contacto'
                                        : 'last contact'}{' '}
                                      {formatRelativeTime(
                                        attemptsLastContact,
                                        locale.startsWith('es') ? 'es' : 'en',
                                      )}
                                    </span>
                                  )}
                                </p>
                              )}
                              {lastInteraction && (
                                <p className="text-xs text-muted-foreground/90 italic">
                                  &ldquo;{lastInteraction}&rdquo;
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground align-top">
                          {d.dpd}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground align-top">
                          {COP_FORMATTER.format(d.balance_cop)}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums text-xs text-muted-foreground align-top">
                          {d.last_contact_at
                            ? new Date(d.last_contact_at).toLocaleDateString(locale)
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </section>

          {/* 4. 30-day history + CSV export */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between gap-3">
              <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {t('inmobiliaria.ai.cobranza.reporte.history.heading')}
              </h2>
              <button
                type="button"
                onClick={() => void onExportCsv()}
                disabled={!agencyId}
                className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-sm border border-border text-foreground hover:bg-muted disabled:opacity-50 transition font-medium"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {t('inmobiliaria.ai.cobranza.reporte.history.exportCsv')}
              </button>
            </div>
            {historyLoading && history.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">—</p>
            ) : (
              <>
                <div className="overflow-x-auto overscroll-contain">
                <table className="w-full text-sm">
                  <thead className="bg-muted/10 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                        {locale.startsWith('es') ? 'Fecha' : 'Date'}
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                        PKR
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                        {locale.startsWith('es') ? 'Morosidad' : 'Delinquency'}
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                        {locale.startsWith('es') ? 'Fuera horario' : 'Outside hours'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => {
                      const pkr = entry.summary.pkr_pct ?? entry.summary.pkr_7d_pct
                      return (
                        <tr key={entry.report_date} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-mono tabular-nums text-foreground">
                            {entry.report_date}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                            {pkr != null ? `${pkr.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                            {entry.summary.indice_morosidad_pct != null
                              ? `${entry.summary.indice_morosidad_pct.toFixed(1)}%`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                            {entry.summary.calls_outside_window_count ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
                {historyHasMore && (
                  <div className="p-3 border-t border-border bg-muted/20 text-center">
                    <button
                      type="button"
                      onClick={() => void historyLoadMore()}
                      disabled={historyLoadingMore}
                      className="text-xs px-4 py-2 rounded-sm border border-border hover:bg-muted disabled:opacity-50 transition font-medium"
                    >
                      {historyLoadingMore
                        ? locale.startsWith('es') ? 'Cargando...' : 'Loading...'
                        : locale.startsWith('es') ? 'Cargar más' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function KpiTile({
  label,
  value,
  alert,
}: {
  label: string
  value: string
  alert: boolean
}) {
  return (
    <div
      className={[
        'rounded-xl border bg-card p-4',
        alert
          ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
          : 'border-border',
      ].join(' ')}
    >
      <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          'mt-2 text-3xl font-mono tabular-nums',
          alert
            ? 'text-[#C4503B] dark:text-[#E0664D] font-bold'
            : 'text-[#2C7A53] dark:text-[#3EAE70]',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}

export default function ReportePage() {
  return (
    <PageGuard module="cobranza" action="view">
      <ReporteViewerContent />
    </PageGuard>
  )
}
