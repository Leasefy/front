'use client'

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDateTime, fmtDiaCorto, fmtPorcentaje, USD_TO_COP } from '@/lib/admin/format'
import { NOMBRE_DEL_MODELO } from '@/lib/admin/modelo-de-cobro'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { LaPlataforma, type ResumenDeLaPlataforma } from '@/components/admin/LaPlataforma'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'
import { Card, MonoLabel, StatusBadge } from '@leasefy/cadence'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { legible, resultadoDeLaLlamada } from '@/lib/admin/textos-del-admin'

/* ── Contract: docs/ADMIN-API-CONTRACT.md (back repo) — GET /dashboard ─────
 * 12 independent blocks via Promise.allSettled; each block may be null
 * (per-block tolerance). Numeric amounts/counts arrive as strings (::text).
 * ───────────────────────────────────────────────────────────────────────── */

interface TopKpis {
  paid_total_mtd: string
  paid_count_mtd: string
  vapi_cost_mtd: string   // USD
  claude_cost_mtd: string // USD
  debtors_active: string
  debtors_closed: string
  cartera_atrasada_count: string
  cartera_atrasada_amount: string
}

interface TodayRow {
  payments_today_count: string
  payments_today_total: string
  payments_yesterday_count: string
  payments_yesterday_total: string
  calls_today_count: string
  calls_yesterday_count: string
  promises_today_count: string
  promises_yesterday_count: string
  escalations_today_count: string
  escalations_yesterday_count: string
  new_agencies_today: string
  new_agencies_yesterday: string
  compliance_events_today: string
  compliance_events_yesterday: string
  vapi_cost_today: string
  vapi_cost_yesterday: string
}

interface PlanRow {
  billing_model: string
  agency_count: string
  active_count: string
  paid_mtd: string | null
  debtors_count: string
  open_promises_count: string
}

interface KeyMetrics {
  avg_ticket_30d: string
  avg_promise_amount_30d: string
  promise_kept_pct_30d: string
  call_completion_pct_30d: string
}

interface DayBucket {
  day: string
  paid_total: string
  calls_count: string
  vapi_cost: string
}

interface ExperimentVariant {
  variant_id: string
  label: string
  assignment_count: string
}

interface ActiveExperiment {
  id: string
  name: string
  status: string
  created_at: string
  variants: ExperimentVariant[]
}

interface TxRow {
  id: string
  amount: string
  status: string
  provider: string | null
  paid_at: string | null
  created_at: string
  debtor_name: string
  legal_name: string | null
}

interface AgencyRow {
  tenant_id: string
  legal_name: string
  debtors_count: string
  calls_30d: string
  open_promises: string
  open_escalations: string
  paid_30d: string | null
}

interface OutcomeRow {
  outcome: string | null
  count: string
}

interface OpenEscalation {
  id: string
  tenant_id: string
  status: string
  urgency: string
  created_at: string
  debtor_name: string
  legal_name: string | null
}

interface ComplianceCount {
  event_type: string
  count: string
}

interface FooterMetrics {
  mrr: string
  arr: string
  channel_mix: { call_type: string; count: string }[]
  calls_this_month: string
}

interface DashboardResponse {
  topKpis: TopKpis | null
  today: TodayRow | null
  planBreakdown: PlanRow[] | null
  keyMetrics: KeyMetrics | null
  dailyTrend: DayBucket[] | null
  activeExperiment: ActiveExperiment | null
  recentTransactions: TxRow[] | null
  agencies: AgencyRow[] | null
  outcomes: OutcomeRow[] | null
  openEscalations: OpenEscalation[] | null
  complianceCounts: ComplianceCount[] | null
  footer: FooterMetrics | null
}

// ── helpers ─────────────────────────────────────────────────────────────────

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function urgencyTone(u: string): PillTone {
  if (u === 'live') return 'bad'
  if (u === 'high') return 'warn'
  if (u === 'medium') return 'info'
  return 'neutral'
}

function paymentTone(s: string): PillTone {
  if (s === 'approved') return 'ok'
  if (s === 'pending') return 'warn'
  if (s === 'declined') return 'bad'
  return 'neutral'
}

function pctDelta(curr: number, prev: number) {
  if (prev === 0) return { value: 0, tone: 'neutral' as const }
  const v = ((curr - prev) / prev) * 100
  return { value: v, tone: v > 0 ? ('ok' as const) : v < 0 ? ('bad' as const) : ('neutral' as const) }
}

// ── plain-div bar chart (Vapi cost: orange/bad) ──────────────────────────────

function TrendBars({ trend }: { trend: DayBucket[] }) {
  if (trend.length === 0) return <p className="py-4 text-body-sm text-fg-muted">Todavía no hay datos.</p>
  const paidVals = trend.map((d) => num(d.paid_total))
  const costVals = trend.map((d) => num(d.vapi_cost) * USD_TO_COP)
  const maxVal = Math.max(...paidVals, ...costVals, 1)

  return (
    <div className="space-y-1">
      {/* Legend */}
      <div className="mb-3 flex items-center gap-4 text-caption text-fg-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-success" /> Cobrado</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-danger" /> Costo de Vapi</span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {trend.map((d, i) => {
          const paidH = (paidVals[i]! / maxVal) * 100
          const costH = (costVals[i]! / maxVal) * 100
          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col justify-end gap-px"
              title={`${fmtDiaCorto(d.day)}: cobrado ${fmtCOP(paidVals[i]!)} · Vapi ${fmtCOP(costVals[i]!)}`}
            >
              <div className="rounded-t-[4px] bg-success" style={{ height: `${Math.max(1, paidH)}%` }} />
            </div>
          )
        })}
      </div>
      {/* Cost bars below */}
      <div className="flex items-start gap-1 h-10 mt-0.5">
        {trend.map((d, i) => {
          const costH = (costVals[i]! / maxVal) * 100
          return (
            <div
              key={d.day}
              className="flex-1"
              title={`Vapi ${fmtCOP(costVals[i]!)}`}
            >
              <div className="rounded-b-[4px] bg-danger" style={{ height: `${Math.max(1, costH)}%` }} />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-caption text-fg-subtle">
        <span>{fmtDiaCorto(trend[0]?.day)}</span>
        <span className="tabular-nums">cobrado en total {fmtCOP(paidVals.reduce((a, b) => a + b, 0))}</span>
        <span>{fmtDiaCorto(trend[trend.length - 1]?.day)}</span>
      </div>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

/** /admin — Resumen dashboard (BACK.md §8.1 · FRONT.md §6.1). */
export default function AdminDashboard() {
  const router = useRouter()
  const dash = useApiQuery<DashboardResponse>(
    (signal) => adminApi('/dashboard', { signal }),
    [],
  )
  // (19-10-2026) Lo de Leasefy, aparte: si la cobranza por voz falla, la
  // plataforma igual se ve (y al revés).
  const plataforma = useApiQuery<ResumenDeLaPlataforma>((signal) => adminApi('/plataforma', { signal }), [])

  if (dash.isLoading && plataforma.isLoading)
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <LoadingBlock label="Cargando el resumen" filas={8} />
      </div>
    )

  const d = dash.data

  const kpis = d?.topKpis
  const today = d?.today
  const plans = d?.planBreakdown ?? []
  const metrics = d?.keyMetrics
  const trend = d?.dailyTrend ?? []
  const experiment = d?.activeExperiment ?? null
  const transactions = d?.recentTransactions ?? []
  const agencies = d?.agencies ?? []
  const outcomes = d?.outcomes ?? []
  const escalations = d?.openEscalations ?? []
  const compliance = d?.complianceCounts ?? []
  const footer = d?.footer

  const costoVapiCop = num(kpis?.vapi_cost_mtd) * USD_TO_COP
  const costoClaude = num(kpis?.claude_cost_mtd) * USD_TO_COP
  const costoTotal = costoVapiCop + costoClaude
  const cobrado = num(kpis?.paid_total_mtd)
  const roi = costoTotal > 0 ? cobrado / costoTotal : null
  const paidDelta = pctDelta(num(today?.payments_today_total), num(today?.payments_yesterday_total))

  const todayDate = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  const outcomesTotal = outcomes.reduce((acc, o) => acc + num(o.count), 0)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Resumen"
        description="Leasefy de un vistazo: las inmobiliarias, sus contratos y su plata. Abajo, la cobranza por voz."
      />

      <LaPlataforma estado={plataforma} onInmobiliarias={(plan) => router.push(plan ? `/admin/tenants?plan=${plan}` : '/admin/tenants')} />

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border-faint pt-6">
        <div className="space-y-1">
          <h2 className="text-h3 font-semibold text-fg">Cobranza por voz</h2>
          <p className="text-body-sm text-fg-muted">
            Mori, el asistente que llama a los inquilinos en mora: lo cobrado, lo que cuesta y lo que pasa hoy.
          </p>
        </div>
      </div>

      {dash.error && !dash.data ? <ErrorBlock error={dash.error} onReintentar={dash.refetch} titulo="No pudimos cargar la cobranza por voz" /> : null}

      {/* ── 1. Hero KPI strip ───────────────────────────────────────────── */}
      {dash.isLoading ? <LoadingBlock label="Cargando la cobranza por voz" filas={4} /> : kpis ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" aria-label="El mes">
          <KpiCard
            label="Cobrado · este mes"
            value={fmtCOP(cobrado)}
            hint={`${num(kpis.paid_count_mtd).toLocaleString('es-CO')} pagos aprobados`}
            tone="ok"
          />
          <KpiCard
            label="Costo · este mes"
            value={fmtCOP(costoTotal)}
            hint={`Vapi ${fmtCOP(costoVapiCop)} · Claude ${fmtCOP(costoClaude)}`}
            tone="bad"
          />
          <KpiCard
            label="Retorno"
            value={roi != null ? `${roi.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x` : '—'}
            hint={roi != null ? 'Lo cobrado dividido por lo que cuestan' : 'Falta el costo'}
          />
          <KpiCard
            label="Deudores"
            value={
              <span>
                <span className="text-fg">{kpis.debtors_active}</span>
                <span className="text-fg-muted"> / {kpis.debtors_closed}</span>
              </span>
            }
            hint="Activos / cerrados"
          />
          <KpiCard
            label="Cartera atrasada"
            value={kpis.cartera_atrasada_count}
            hint={fmtCOP(num(kpis.cartera_atrasada_amount))}
            tone="warn"
          />
        </section>
      ) : (
        dash.error ? null : <p className="text-body-sm text-fg-muted">Las cifras del mes no llegaron.</p>
      )}

      {/* ── 2. Plan breakdown (LEFT) + HOY mega-card (RIGHT) ───────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        <Card className="p-6">
          <h2 className="mb-4 text-subtitle font-semibold text-fg">Por modelo de cobro</h2>
          {plans.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-fg-muted">Todavía no hay inmobiliarias.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Activas</TableHead>
                  <TableHead className="text-right">Deudores</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.billing_model}>
                    <TableCell className="font-medium">
                      {(NOMBRE_DEL_MODELO as Record<string, string>)[p.billing_model ?? ''] ?? (p.billing_model ? legible(p.billing_model) : 'Sin modelo')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-caption">{p.agency_count}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-caption text-success">{p.active_count}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-caption">{p.debtors_count}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-caption text-fg-muted">
                      {p.paid_mtd ? fmtCOP(num(p.paid_mtd)) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Key metrics */}
          {metrics && (
            <div className="mt-5 pt-4 border-t border-border">
              <MonoLabel className="block mb-3">
                Métricas clave · 30 días
              </MonoLabel>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Pago promedio', value: fmtCOP(num(metrics.avg_ticket_30d)) },
                  { label: 'Promesa promedio', value: fmtCOP(num(metrics.avg_promise_amount_30d)) },
                  { label: 'Promesas cumplidas', value: fmtPorcentaje(num(metrics.promise_kept_pct_30d)) },
                  { label: 'Llamadas completas', value: fmtPorcentaje(num(metrics.call_completion_pct_30d)) },
                ].map((m) => (
                  <div key={m.label}>
                    <MonoLabel className="block">{m.label}</MonoLabel>
                    <div className="mt-1 font-mono text-body-sm font-semibold tabular-nums">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* HOY mega-card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <MonoLabel className="block">
              Hoy · {todayDate}
            </MonoLabel>
            <StatusBadge tone="success" dot pulse>En vivo</StatusBadge>
          </div>

          {today ? (
            <>
              <div className="flex items-baseline gap-4 flex-wrap mb-1">
                <span className="font-mono text-stat font-semibold tabular-nums text-success">
                  {fmtCOP(num(today.payments_today_total))}
                </span>
                {paidDelta.value !== 0 && (
                  <span
                    className={
                      'font-mono text-body-sm tabular-nums ' +
                      (paidDelta.tone === 'ok' ? 'text-success' : paidDelta.tone === 'bad' ? 'text-danger' : 'text-fg-muted')
                    }
                  >
                    {paidDelta.value > 0 ? '+' : ''}{paidDelta.value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} % frente a ayer
                  </span>
                )}
              </div>
              <MonoLabel className="block mb-4">
                Ayer · {fmtCOP(num(today.payments_yesterday_total))}
              </MonoLabel>

              <div className="border-t border-border pt-3 mb-4">
                <MonoLabel className="block">Lo invertido hoy</MonoLabel>
                <div className="font-mono text-h2 font-semibold tabular-nums text-danger mt-0.5">
                  {fmtCOP(num(today.vapi_cost_today) * USD_TO_COP)}
                </div>
                <MonoLabel className="block mt-0.5">
                  Ayer · {fmtCOP(num(today.vapi_cost_yesterday) * USD_TO_COP)}
                </MonoLabel>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-border pt-4">
                {[
                  { label: 'Pagos', value: today.payments_today_count, tone: 'text-success' },
                  { label: 'Llamadas', value: today.calls_today_count, hint: `ayer ${today.calls_yesterday_count}`, tone: '' },
                  { label: 'Promesas', value: today.promises_today_count, hint: `ayer ${today.promises_yesterday_count}`, tone: '' },
                  { label: 'Escalaciones', value: today.escalations_today_count, tone: num(today.escalations_today_count) > 0 ? 'text-warning' : '' },
                  { label: 'Inmobiliarias nuevas', value: today.new_agencies_today, tone: '' },
                  { label: 'Cumplimiento', value: today.compliance_events_today, tone: '' },
                ].map((m) => (
                  <div key={m.label}>
                    <MonoLabel className="block">{m.label}</MonoLabel>
                    <div className={`mt-1 font-semibold tabular-nums text-xl ${m.tone}`}>{m.value}</div>
                    {m.hint && <div className="text-caption text-fg-subtle">{m.hint}</div>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-body-sm text-fg-muted">Las cifras de hoy no llegaron.</p>
          )}
        </Card>
      </section>

      {/* ── 3. Chart + Experimento + Transacciones ──────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-subtitle font-semibold text-fg">Lo cobrado frente al costo · últimos 14 días</h2>
          <TrendBars trend={trend} />
        </Card>

        {/* Active experiment */}
        <Card className="p-6">
          <h2 className="mb-4 text-subtitle font-semibold text-fg">Experimento en curso</h2>
          {experiment ? (
            <>
              <div className="font-semibold text-base break-all mb-1">{experiment.name}</div>
              <Pill tone="info">{experiment.status}</Pill>
              <div className="border-t border-border mt-3 pt-3">
                <div className="flex justify-between text-caption">
                  <span className="text-fg-subtle">asignaciones</span>
                  <span className="tabular-nums font-mono">
                    {experiment.variants.reduce((acc, v) => acc + num(v.assignment_count), 0)}
                  </span>
                </div>
                <div className="text-caption text-fg-muted font-mono mt-1 space-y-0.5">
                  {experiment.variants.length === 0 ? (
                    <span>—</span>
                  ) : (
                    experiment.variants.map((v) => (
                      <div key={v.variant_id} className="flex justify-between gap-2">
                        <span className="truncate">{v.label}</span>
                        <span className="tabular-nums">{v.assignment_count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 font-mono text-caption text-fg-subtle">
                  desde {fmtDateTime(experiment.created_at)}
                </div>
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-body-sm text-fg-muted">No hay experimentos en curso.</p>
          )}
        </Card>

        {/* Recent transactions */}
        <Card className="p-6">
          <div className="flex items-baseline justify-between mb-3">
            <MonoLabel>transacciones · 24h</MonoLabel>
            <span className="font-mono text-caption text-fg-subtle">{transactions.length}</span>
          </div>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-fg-muted">Todavía no hay pagos hoy.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="border-b border-border last:border-0 pb-2 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-body-sm truncate flex-1">{t.debtor_name}</span>
                    <span className={`tabular-nums font-mono text-body-sm ${t.status === 'approved' ? 'text-success' : 'text-fg-muted'}`}>
                      {fmtCOP(parseFloat(t.amount))}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-0.5">
                    <span className="text-caption text-fg-muted truncate flex-1">
                      {t.legal_name ?? '—'} · {t.status}
                    </span>
                    <Pill tone={paymentTone(t.status)}>{t.status}</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ── 4. Agencies + Outcomes ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-subtitle font-semibold text-fg">Inmobiliarias · 30 días</h2>
            <Button variant="link" size="sm" hideArrow onClick={() => router.push('/admin/tenants')}>
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Inmobiliaria</TableHead>
                  <TableHead className="text-right">Deudores</TableHead>
                  <TableHead className="text-right">Llamadas 30 d</TableHead>
                  <TableHead className="text-right">Promesas</TableHead>
                  <TableHead className="text-right">Escal.</TableHead>
                  <TableHead className="text-right">Cobrado 30d</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((a) => (
                  <TableRow
                    key={a.tenant_id}
                    className="border-b border-border last:border-0 cursor-pointer"
                    onClick={() => router.push(`/admin/tenants/${a.tenant_id}`)}
                  >
                    <TableCell className="px-3 py-2.5 font-medium">{a.legal_name}</TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums font-mono text-caption">{a.debtors_count}</TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums font-mono text-caption">{a.calls_30d}</TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums font-mono text-caption">{a.open_promises}</TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums font-mono text-caption">
                      {num(a.open_escalations) > 0 ? (
                        <span className="text-warning font-medium">{a.open_escalations}</span>
                      ) : a.open_escalations}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums font-mono text-caption text-fg-muted">
                      {a.paid_30d ? fmtCOP(num(a.paid_30d)) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {agencies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-fg-muted">Todavía no hay inmobiliarias.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Outcomes */}
        <Card className="p-6">
          <h2 className="mb-4 text-subtitle font-semibold text-fg">Cómo terminan las llamadas · 30 días</h2>
          {outcomes.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Todavía no hay datos.</p>
          ) : (
            <div className="space-y-2">
              {outcomes.map((o) => {
                const pct = outcomesTotal > 0 ? (num(o.count) / outcomesTotal) * 100 : 0
                return (
                  <div key={o.outcome ?? 'none'}>
                    <div className="flex items-baseline justify-between text-caption mb-1">
                      <span className="font-medium">{resultadoDeLaLlamada(o.outcome)}</span>
                      <span className="tabular-nums font-mono text-fg-muted">{o.count} · {fmtPorcentaje(pct)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-hover overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      {/* ── 5. Escalations + Compliance ─────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="mb-4 text-subtitle font-semibold text-fg">Escalaciones abiertas</h2>
          <Card className="overflow-hidden">
            <Table>
              <TableBody>
                {escalations.map((e) => (
                  <TableRow key={e.id} className="border-b border-border last:border-0">
                    <TableCell className="px-3 py-2.5">
                      <Pill tone={urgencyTone(e.urgency)}>{e.urgency}</Pill>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <div className="font-medium text-fg leading-tight">{e.debtor_name}</div>
                      <div className="text-caption text-fg-subtle leading-tight truncate max-w-[240px]">
                        {e.legal_name ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right text-fg-muted text-caption whitespace-nowrap font-mono">
                      {fmtDateTime(e.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
                {escalations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-fg-muted">
                      No hay escalaciones abiertas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-subtitle font-semibold text-fg">Cumplimiento · 30 días</h2>
          <Card className="space-y-1.5 p-6">
            {compliance.map((c) => (
              <div
                key={c.event_type}
                className="flex items-baseline justify-between text-body-sm border-b border-border last:border-0 py-1.5"
              >
                <span className="font-mono text-caption text-fg">{c.event_type}</span>
                <span className="tabular-nums font-mono font-medium">{c.count}</span>
              </div>
            ))}
            {compliance.length === 0 && (
              <p className="text-body-sm text-fg-muted">Sin eventos.</p>
            )}
          </Card>
        </div>
      </section>

      {/* ── 6. Footer bar — MRR · ARR · Channels ───────────────────────── */}
      {footer && (
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-start">
            <div>
              <MonoLabel className="block">Cobranza · ingreso mensual</MonoLabel>
              <div className="mt-1 text-xl font-semibold tabular-nums text-success">{fmtCOP(num(footer.mrr))}</div>
            </div>
            <div>
              <MonoLabel className="block">Cobranza · al año</MonoLabel>
              <div className="mt-1 text-xl font-semibold tabular-nums">{fmtCOP(num(footer.arr))}</div>
            </div>
            <div className="md:col-span-1">
              <MonoLabel className="block mb-2">Canales · este mes</MonoLabel>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption font-mono">
                {footer.channel_mix.length === 0 ? (
                  <span className="text-fg-muted">Sin llamadas</span>
                ) : (
                  footer.channel_mix.map((c) => (
                    <span key={c.call_type}>
                      <span className="tabular-nums">{c.count}</span>{' '}
                      <span className="text-fg-muted">{c.call_type}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <MonoLabel className="block">Llamadas · este mes</MonoLabel>
              <div className="mt-1 text-xl font-semibold tabular-nums">{footer.calls_this_month}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
