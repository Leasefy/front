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
import { motion } from 'framer-motion'
import { Warning, Download, GearSix, BellRinging, CalendarBlank } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { useDailyReport, useDailyReportHistory, downloadHistoryCsv } from '@/lib/hooks/cobranza/use-daily-report'
import { useThresholds } from '@/lib/hooks/cobranza/use-thresholds'
import { toDebtorRef } from '@/lib/hooks/cobranza/compliance-entries'
import { CobranzaReporteSkeleton } from '@/components/skeleton/panel/CobranzaReporteSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { MonoLabel } from '@leasefy/cadence'

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
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

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

  useAutoRefresh(refetch)

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
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/ai/cobranza/reporte/suscripcion">
              <BellRinging className="w-3.5 h-3.5" aria-hidden="true" />
              {locale.startsWith('es') ? 'Suscripción' : 'Subscription'}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/ai/cobranza/reporte/thresholds">
              <GearSix className="w-3.5 h-3.5" aria-hidden="true" />
              {locale.startsWith('es') ? 'Umbrales' : 'Thresholds'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && !data && (
        <div className="rounded-xl bg-danger-soft text-danger">
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
                  key={`${alert.code}-${idx}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={[
                    'rounded-xl border p-3 flex items-start gap-3',
                    alert.level === 'CRITICAL'
                      ? 'border-danger/30 bg-danger-soft'
                      : 'border-warning/30 bg-warning-soft',
                  ].join(' ')}
                  role="alert"
                >
                  <Warning
                    className={[
                      'w-4 h-4 flex-shrink-0 mt-0.5',
                      alert.level === 'CRITICAL' ? 'text-danger' : 'text-warning',
                    ].join(' ')}
                    weight="fill"
                    aria-hidden="true"
                  />
                  {/* `message_es` viene redactado del agente. Antes se ignoraba
                      para componer «{kpi}: {actual} (umbral {threshold})» con
                      campos que no existen → «: undefined (umbral 12)». */}
                  <p
                    className={[
                      'text-xs',
                      alert.level === 'CRITICAL' ? 'text-danger' : 'text-warning',
                    ].join(' ')}
                  >
                    {alert.message_es}
                  </p>
                </motion.div>
              ))}
            </section>
          )}

          {/* 3. Top-N debtors */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <MonoLabel>
                {t('inmobiliaria.ai.cobranza.reporte.topDebtors.heading')} · Top {topN}
              </MonoLabel>
            </div>
            {data.top_debtors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('inmobiliaria.ai.cobranza.reporte.topDebtors.empty')}
              </p>
            ) : (
              <Table>
                <TableHeader className="bg-muted/10 border-b border-border">
                  <TableRow>
                    <TableHead>
                      {locale.startsWith('es') ? 'Deudor' : 'Debtor'}
                    </TableHead>
                    <TableHead className="text-right">
                      DPD
                    </TableHead>
                    <TableHead className="text-right">
                      {locale.startsWith('es') ? 'Saldo' : 'Balance'}
                    </TableHead>
                    <TableHead>
                      {locale.startsWith('es') ? 'Último contacto' : 'Last contact'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_debtors.slice(0, topN).map((d) => (
                    <TableRow key={d.debtor_id} className="border-b border-border last:border-0">
                      {/* El agente SÍ manda `debtor_name` (JOIN agregado el
                          2026-08-10); esta tabla se quedó pintando la
                          referencia y mostraba «CD06141F» en la columna
                          «Deudor». Un prefijo de UUID no identifica a nadie:
                          para decidir a quién llamar primero hace falta el
                          nombre. La referencia queda de respaldo, para un
                          payload cacheado sin el JOIN — nunca un nombre
                          inventado. */}
                      <TableCell className="px-3 py-2 text-xs text-foreground">
                        {d.debtor_name?.trim() || (
                          <span className="font-mono text-muted-foreground">
                            {toDebtorRef(d.debtor_id_masked ?? d.debtor_id)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                        {d.dpd}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                        {COP_FORMATTER.format(d.balance_cop)}
                      </TableCell>
                      <TableCell className="px-3 py-2 font-mono tabular-nums text-xs text-muted-foreground">
                        {d.last_contact_at
                          ? new Date(d.last_contact_at).toLocaleDateString(locale)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          {/* 4. 30-day history + CSV export */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between gap-3">
              <MonoLabel>
                {t('inmobiliaria.ai.cobranza.reporte.history.heading')}
              </MonoLabel>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => void onExportCsv()}
                disabled={!agencyId}
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {t('inmobiliaria.ai.cobranza.reporte.history.exportCsv')}
              </Button>
            </div>
            {historyLoading && history.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">—</p>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-muted/10 border-b border-border">
                    <TableRow>
                      <TableHead>
                        {locale.startsWith('es') ? 'Fecha' : 'Date'}
                      </TableHead>
                      <TableHead className="text-right">
                        PKR
                      </TableHead>
                      <TableHead className="text-right">
                        {locale.startsWith('es') ? 'Morosidad' : 'Delinquency'}
                      </TableHead>
                      <TableHead className="text-right">
                        {locale.startsWith('es') ? 'Fuera horario' : 'Outside hours'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => {
                      const pkr = entry.summary.pkr_pct ?? entry.summary.pkr_7d_pct
                      return (
                        <TableRow key={entry.report_date} className="border-b border-border last:border-0">
                          <TableCell className="px-3 py-2 font-mono tabular-nums text-foreground">
                            {entry.report_date}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                            {pkr != null ? `${pkr.toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                            {entry.summary.indice_morosidad_pct != null
                              ? `${entry.summary.indice_morosidad_pct.toFixed(1)}%`
                              : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                            {entry.summary.calls_outside_window_count ?? '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {historyHasMore && (
                  <div className="p-3 border-t border-border bg-muted/20 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      hideArrow
                      onClick={() => void historyLoadMore()}
                      disabled={historyLoadingMore}
                    >
                      {historyLoadingMore
                        ? locale.startsWith('es') ? 'Cargando...' : 'Loading...'
                        : locale.startsWith('es') ? 'Cargar más' : 'Load more'}
                    </Button>
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
          ? 'border-danger/30'
          : 'border-border',
      ].join(' ')}
    >
      <MonoLabel>
        {label}
      </MonoLabel>
      <p
        className={[
          'mt-2 text-3xl font-mono tabular-nums',
          alert
            ? 'text-danger font-bold'
            : 'text-success',
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
