'use client'

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDateTime, USD_TO_COP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

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
  if (trend.length === 0) return <div className="text-sm text-fg-muted py-4">Sin datos.</div>
  const paidVals = trend.map((d) => num(d.paid_total))
  const costVals = trend.map((d) => num(d.vapi_cost) * USD_TO_COP)
  const maxVal = Math.max(...paidVals, ...costVals, 1)

  return (
    <div className="space-y-1">
      {/* Legend */}
      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-ok/70" /> cobrado</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-bad/60" /> costo vapi</span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {trend.map((d, i) => {
          const paidH = (paidVals[i]! / maxVal) * 100
          const costH = (costVals[i]! / maxVal) * 100
          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col justify-end gap-px"
              title={`${d.day.slice(5)}: cobrado ${fmtCOP(paidVals[i]!)} · vapi ${fmtCOP(costVals[i]!)}`}
            >
              <div className="bg-ok/70" style={{ height: `${Math.max(1, paidH)}%` }} />
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
              <div className="bg-bad/60" style={{ height: `${Math.max(1, costH)}%` }} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-fg-subtle mt-1">
        <span>{trend[0]?.day?.slice(5)}</span>
        <span className="tabular-nums">cobrado total {fmtCOP(paidVals.reduce((a, b) => a + b, 0))}</span>
        <span>{trend[trend.length - 1]?.day?.slice(5)}</span>
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

  if (dash.isLoading) return <div className="p-8"><LoadingBlock label="cargando dashboard" /></div>
  if (dash.error && !dash.data) return <div className="p-8"><ErrorBlock error={dash.error} /></div>

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
  }).toUpperCase()

  const outcomesTotal = outcomes.reduce((acc, o) => acc + num(o.count), 0)

  return (
    <div className="p-6 lg:p-8 max-w-[1500px]">
      <PageHeader
        label="00 · resumen"
        title="Operación, en una sola vista."
        description="Datos en tiempo casi-real. Refresca manualmente."
      />

      {/* ── 1. Hero KPI strip ───────────────────────────────────────────── */}
      {kpis ? (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <KpiCard
            label="Cobrado · mes"
            value={fmtCOP(cobrado)}
            hint={`${kpis.paid_count_mtd} pagos aprobados`}
            tone="ok"
          />
          <KpiCard
            label="Costo agente · mes"
            value={fmtCOP(costoTotal)}
            hint={`Vapi ${fmtCOP(costoVapiCop)} · Claude ${fmtCOP(costoClaude)} · WA —`}
            tone="bad"
          />
          <KpiCard
            label="ROI agente"
            value={roi != null ? `${roi.toFixed(2)}x` : '—'}
            hint={roi != null ? 'cobrado / costo' : 'falta costo'}
          />
          <KpiCard
            label="Activos / cerrados"
            value={
              <span>
                <span className="text-fg">{kpis.debtors_active}</span>
                <span className="text-fg-muted"> / {kpis.debtors_closed}</span>
              </span>
            }
            hint="deudores"
          />
          <KpiCard
            label="Atrasados"
            value={kpis.cartera_atrasada_count}
            hint={fmtCOP(num(kpis.cartera_atrasada_amount))}
            tone="warn"
          />
        </section>
      ) : (
        <div className="mb-6 text-sm text-fg-muted">Bloque KPIs no disponible.</div>
      )}

      {/* ── 2. Plan breakdown (LEFT) + HOY mega-card (RIGHT) ───────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Plan breakdown */}
        <div className="lg:col-span-2 card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-4">
            inmobiliarias por modelo
          </div>
          {plans.length === 0 ? (
            <div className="text-sm text-fg-muted py-6 text-center">Sin agencias.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                  <th className="text-left py-2">Modelo</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">Activas</th>
                  <th className="text-right py-2">Deudores</th>
                  <th className="text-right py-2">Promesas</th>
                  <th className="text-right py-2">Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.billing_model} className="border-b border-bg-border last:border-0">
                    <td className="py-2.5 text-xs font-medium uppercase tracking-wide">{p.billing_model}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono text-xs">{p.agency_count}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono text-xs text-ok">{p.active_count}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono text-xs">{p.debtors_count}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono text-xs">{p.open_promises_count}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono text-xs text-fg-muted">
                      {p.paid_mtd ? fmtCOP(num(p.paid_mtd)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Key metrics */}
          {metrics && (
            <div className="mt-5 pt-4 border-t border-bg-border">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
                métricas clave · 30d
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Ticket prom.', value: fmtCOP(num(metrics.avg_ticket_30d)) },
                  { label: 'Promesa prom.', value: fmtCOP(num(metrics.avg_promise_amount_30d)) },
                  { label: '% Cumplimiento', value: `${num(metrics.promise_kept_pct_30d).toFixed(1)}%` },
                  { label: '% Compleción', value: `${num(metrics.call_completion_pct_30d).toFixed(1)}%` },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{m.label}</div>
                    <div className="mt-1 font-semibold tabular-nums text-sm">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HOY mega-card */}
        <div className="lg:col-span-3 card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              hoy — {todayDate}
            </div>
            <span className="font-mono text-[10px] uppercase text-fg-subtle">live</span>
          </div>

          {today ? (
            <>
              <div className="flex items-baseline gap-4 flex-wrap mb-1">
                <span className="text-3xl font-semibold tabular-nums text-ok">
                  {fmtCOP(num(today.payments_today_total))}
                </span>
                {paidDelta.value !== 0 && (
                  <span
                    className={
                      'font-mono text-sm tabular-nums ' +
                      (paidDelta.tone === 'ok' ? 'text-ok' : paidDelta.tone === 'bad' ? 'text-bad' : 'text-fg-muted')
                    }
                  >
                    {paidDelta.value > 0 ? '+' : ''}{paidDelta.value.toFixed(1)}% vs ayer
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-4">
                ayer · {fmtCOP(num(today.payments_yesterday_total))}
              </div>

              <div className="border-t border-bg-border pt-3 mb-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">inversión hoy</div>
                <div className="text-2xl font-semibold tabular-nums text-bad mt-0.5">
                  {fmtCOP(num(today.vapi_cost_today) * USD_TO_COP)}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mt-0.5">
                  ayer · {fmtCOP(num(today.vapi_cost_yesterday) * USD_TO_COP)}
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 border-t border-bg-border pt-4">
                {[
                  { label: 'Pagos', value: today.payments_today_count, tone: 'text-ok' },
                  { label: 'Llamadas', value: today.calls_today_count, hint: `ayer ${today.calls_yesterday_count}`, tone: '' },
                  { label: 'Promesas', value: today.promises_today_count, hint: `ayer ${today.promises_yesterday_count}`, tone: '' },
                  { label: 'Escalaciones', value: today.escalations_today_count, tone: num(today.escalations_today_count) > 0 ? 'text-warn' : '' },
                  { label: 'Nuevas inmob.', value: today.new_agencies_today, tone: '' },
                  { label: 'Eventos comp.', value: today.compliance_events_today, tone: '' },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{m.label}</div>
                    <div className={`mt-1 font-semibold tabular-nums text-xl ${m.tone}`}>{m.value}</div>
                    {m.hint && <div className="font-mono text-[9px] uppercase text-fg-subtle">{m.hint}</div>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-sm text-fg-muted py-6 text-center">Bloque HOY no disponible.</div>
          )}
        </div>
      </section>

      {/* ── 3. Chart + Experimento + Transacciones ──────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-2 card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            recaudo vs costo · últimos 14 días
          </div>
          <TrendBars trend={trend} />
        </div>

        {/* Active experiment */}
        <div className="card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            experimento activo
          </div>
          {experiment ? (
            <>
              <div className="font-semibold text-base break-all mb-1">{experiment.name}</div>
              <Pill tone="info">{experiment.status}</Pill>
              <div className="border-t border-bg-border mt-3 pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-fg-subtle">asignaciones</span>
                  <span className="tabular-nums font-mono">
                    {experiment.variants.reduce((acc, v) => acc + num(v.assignment_count), 0)}
                  </span>
                </div>
                <div className="text-xs text-fg-muted font-mono mt-1 space-y-0.5">
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
                <div className="mt-2 font-mono text-[10px] text-fg-subtle">
                  desde {fmtDateTime(experiment.created_at)}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-fg-muted text-center py-6">Sin experimentos corriendo.</div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">transacciones · 24h</span>
            <span className="font-mono text-[10px] text-fg-subtle">{transactions.length}</span>
          </div>
          {transactions.length === 0 ? (
            <div className="text-sm text-fg-muted text-center py-6">Sin transacciones.</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="border-b border-bg-border last:border-0 pb-2 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm truncate flex-1">{t.debtor_name}</span>
                    <span className={`tabular-nums font-mono text-sm ${t.status === 'approved' ? 'text-ok' : 'text-fg-muted'}`}>
                      {fmtCOP(parseFloat(t.amount))}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-0.5">
                    <span className="text-xs text-fg-muted truncate flex-1">
                      {t.legal_name ?? '—'} · {t.status}
                    </span>
                    <Pill tone={paymentTone(t.status)}>{t.status}</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Agencies + Outcomes ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              inmobiliarias · 30 días
            </span>
            <button
              className="font-mono text-[10px] uppercase text-fg-subtle hover:text-fg"
              onClick={() => router.push('/admin/tenants')}
            >
              ver todo →
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-bg-border font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                  <th className="text-left px-3 py-3">Inmobiliaria</th>
                  <th className="text-right px-3 py-3">Deudores</th>
                  <th className="text-right px-3 py-3">Calls 30d</th>
                  <th className="text-right px-3 py-3">Promesas</th>
                  <th className="text-right px-3 py-3">Escal.</th>
                  <th className="text-right px-3 py-3">Cobrado 30d</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr
                    key={a.tenant_id}
                    className="border-b border-bg-border last:border-0 cursor-pointer"
                    onClick={() => router.push(`/admin/tenants/${a.tenant_id}`)}
                  >
                    <td className="px-3 py-2.5 font-medium">{a.legal_name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-xs">{a.debtors_count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-xs">{a.calls_30d}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-xs">{a.open_promises}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-xs">
                      {num(a.open_escalations) > 0 ? (
                        <span className="text-warn font-medium">{a.open_escalations}</span>
                      ) : a.open_escalations}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-xs text-fg-muted">
                      {a.paid_30d ? fmtCOP(num(a.paid_30d)) : '—'}
                    </td>
                  </tr>
                ))}
                {agencies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-fg-muted text-sm">Sin agencias.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outcomes */}
        <div className="card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-4">
            outcomes llamadas · 30d
          </div>
          {outcomes.length === 0 ? (
            <div className="text-sm text-fg-muted">Sin datos.</div>
          ) : (
            <div className="space-y-2">
              {outcomes.map((o) => {
                const pct = outcomesTotal > 0 ? (num(o.count) / outcomesTotal) * 100 : 0
                return (
                  <div key={o.outcome ?? 'none'}>
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="font-medium">{o.outcome ?? '(sin outcome)'}</span>
                      <span className="tabular-nums font-mono text-fg-muted">{o.count} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-bg-hover overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. Escalations + Compliance ─────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            escalaciones abiertas
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {escalations.map((e) => (
                  <tr key={e.id} className="border-b border-bg-border last:border-0">
                    <td className="px-3 py-2.5">
                      <Pill tone={urgencyTone(e.urgency)}>{e.urgency}</Pill>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-fg leading-tight">{e.debtor_name}</div>
                      <div className="text-xs text-fg-subtle leading-tight truncate max-w-[240px]">
                        {e.legal_name ?? '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-fg-muted text-xs whitespace-nowrap font-mono">
                      {fmtDateTime(e.created_at)}
                    </td>
                  </tr>
                ))}
                {escalations.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-fg-muted text-sm">
                      Sin escalaciones abiertas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            compliance · 30d
          </div>
          <div className="card p-5 space-y-1.5">
            {compliance.map((c) => (
              <div
                key={c.event_type}
                className="flex items-baseline justify-between text-sm border-b border-bg-border last:border-0 py-1.5"
              >
                <span className="font-mono text-xs text-fg">{c.event_type}</span>
                <span className="tabular-nums font-mono font-medium">{c.count}</span>
              </div>
            ))}
            {compliance.length === 0 && (
              <div className="text-sm text-fg-muted">Sin eventos.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. Footer bar — MRR · ARR · Channels ───────────────────────── */}
      {footer && (
        <section className="card p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-start">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">MRR</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-ok">{fmtCOP(num(footer.mrr))}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">ARR · proyectado</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{fmtCOP(num(footer.arr))}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">Valuación</div>
              <div className="mt-1 text-sm font-mono tabular-nums text-fg-muted">
                {fmtCOP(num(footer.arr) * 8)} – {fmtCOP(num(footer.arr) * 12)}
              </div>
              <div className="font-mono text-[9px] text-fg-subtle">8–12× ARR</div>
            </div>
            <div className="md:col-span-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">Canales · mes</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono">
                {footer.channel_mix.length === 0 ? (
                  <span className="text-fg-muted">sin llamadas</span>
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
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">Calls · mes</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{footer.calls_this_month}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
