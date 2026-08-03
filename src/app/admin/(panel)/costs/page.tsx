'use client'

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'

/* ── Types (match ADMIN-API-CONTRACT.md — Costs) ────────────────────────── */

interface Mtd {
  vapi_cost_usd_mtd: string
  claude_cost_usd_mtd: string
  vapi_cost_cop_mtd: string    // pre-converted server-side (COP_PER_USD = 4000)
  claude_cost_cop_mtd: string
  total_cost_cop_mtd: string
}

interface PerTenantRow {
  tenant_id: string
  legal_name: string
  vapi_cost_usd: string
  claude_cost_usd: string
  total_cost_usd: string
  total_cost_cop: string
}

interface DailyRow {
  day: string
  vapi_cost_usd: string
  claude_cost_usd: string
}

interface ModelMixRow {
  model_used: string
  count: string
  cost_usd: string
}

interface CostsResponse {
  mtd: Mtd | null
  perTenant: PerTenantRow[]
  dailySeries: DailyRow[]
  modelMix: ModelMixRow[]
}

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// ── Stacked daily bar chart (plain divs, no chart lib) ─────────────────────

function DailyStackedBars({ daily }: { daily: DailyRow[] }) {
  if (daily.length === 0) return <div className="text-sm text-fg-muted">Sin datos.</div>

  const vapiVals = daily.map((d) => num(d.vapi_cost_usd))
  const claudeVals = daily.map((d) => num(d.claude_cost_usd))
  const totals = vapiVals.map((v, i) => v + (claudeVals[i] ?? 0))
  const max = Math.max(...totals, 0.001)

  const vapiTotal = vapiVals.reduce((a, b) => a + b, 0)
  const claudeTotal = claudeVals.reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-bad/70" /> vapi</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-warn/70" /> claude</span>
      </div>
      <div className="flex items-end gap-1 h-32">
        {totals.map((t, i) => {
          const v = vapiVals[i] ?? 0
          const c = claudeVals[i] ?? 0
          const vH = (v / max) * 100
          const cH = (c / max) * 100
          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end"
              title={`${daily[i]?.day?.slice(5)}: Vapi USD ${v.toFixed(4)} · Claude USD ${c.toFixed(4)}`}
            >
              {cH > 0 && <div className="bg-warn/70" style={{ height: `${Math.max(1, cH)}%` }} />}
              {vH > 0 && <div className="bg-bad/70" style={{ height: `${Math.max(1, vH)}%` }} />}
              {t === 0 && <div className="bg-bg-border" style={{ height: '2px' }} />}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-fg-subtle">
        <span>{daily[0]?.day?.slice(5)}</span>
        <span className="tabular-nums">
          <span className="text-bad">Vapi USD {vapiTotal.toFixed(2)}</span>
          {' · '}
          <span className="text-warn">Claude USD {claudeTotal.toFixed(2)}</span>
        </span>
        <span>{daily[daily.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  )
}

/** /costs — Platform burn (BACK.md §8.9 · FRONT.md §6.17). */
export default function CostsPage() {
  const router = useRouter()

  const costs = useApiQuery<CostsResponse>(
    (signal) => adminApi('/costs', { signal }),
    [],
  )

  const mtd = costs.data?.mtd
  const perTenant = costs.data?.perTenant ?? []
  const daily = costs.data?.dailySeries ?? []
  const modelMix = costs.data?.modelMix ?? []

  const vapiMtdUsd = num(mtd?.vapi_cost_usd_mtd)
  const claudeMtdUsd = num(mtd?.claude_cost_usd_mtd)
  const vapiMtdCop = num(mtd?.vapi_cost_cop_mtd)
  const claudeMtdCop = num(mtd?.claude_cost_cop_mtd)
  const totalCostCop = num(mtd?.total_cost_cop_mtd)

  // Per-tenant columns

  const tenantColumns: Column<PerTenantRow>[] = [
    {
      header: 'Inmobiliaria',
      cell: (r) => <span className="font-medium">{r.legal_name}</span>,
    },
    {
      header: 'Vapi USD',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs text-bad">
          {num(r.vapi_cost_usd).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Claude USD',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs text-bad">
          {num(r.claude_cost_usd).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Total USD',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">
          {num(r.total_cost_usd).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Total COP',
      align: 'right',
      cell: (r) => {
        const totalCop = num(r.total_cost_cop)
        return (
          <span className="tabular-nums font-mono text-xs">
            {totalCop > 0 ? fmtCOP(totalCop) : '—'}
          </span>
        )
      },
    },
  ]

  // Model mix columns

  const modelColumns: Column<ModelMixRow>[] = [
    {
      header: 'Modelo',
      cell: (r) => <span className="font-mono text-xs">{r.model_used}</span>,
    },
    {
      header: 'Invocaciones',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">
          {num(r.count).toLocaleString('es-CO')}
        </span>
      ),
    },
    {
      header: 'Cost USD',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs text-bad">
          {num(r.cost_usd).toFixed(4)}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="10 · costos"
        title="Burn de plataforma."
        description="Vapi + Claude (mes corriente). WhatsApp pendiente."
      />

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Vapi · mes"
          value={`USD ${vapiMtdUsd.toFixed(2)}`}
          hint={fmtCOP(vapiMtdCop)}
          tone="bad"
        />
        <KpiCard
          label="Claude · mes"
          value={`USD ${claudeMtdUsd.toFixed(2)}`}
          hint={fmtCOP(claudeMtdCop)}
          tone="bad"
        />
        <KpiCard
          label="WhatsApp · mes"
          value="—"
          hint="pendiente"
        />
        <KpiCard
          label="Total · mes"
          value={totalCostCop > 0 ? fmtCOP(totalCostCop) : '—'}
          hint="Vapi + Claude en COP"
        />
      </section>

      {/* ── Per-tenant table ──────────────────────────────────────────── */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        por inmobiliaria
      </div>
      <div className="mb-6">
        <DataTable
          columns={tenantColumns}
          rows={perTenant}
          getKey={(r) => r.tenant_id}
          isLoading={costs.isLoading}
          error={costs.error}
          emptyTitle="Sin datos de costos."
          onRowClick={(r) => router.push(`/admin/tenants/${r.tenant_id}`)}
        />
      </div>

      {/* ── Model mix ─────────────────────────────────────────────────── */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        mix por modelo · mes
      </div>
      <div className="mb-6">
        <DataTable
          columns={modelColumns}
          rows={modelMix}
          getKey={(r, i) => r.model_used ?? String(i)}
          isLoading={costs.isLoading}
          error={costs.error}
          emptyTitle="Sin invocaciones este mes."
        />
      </div>

      {/* ── 14-day stacked bars ───────────────────────────────────────── */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        vapi + claude · últimos 14 días (USD)
      </div>
      <div className="card p-5">
        <DailyStackedBars daily={daily} />
      </div>

      {/* Note */}
      <div className="card p-4 border-l-4 border-l-warn mt-6 text-sm text-fg-muted">
        WhatsApp ($/mensaje por 360dialog) no está trackeado aún — pendiente en agent.
        Cuando se cierre, este dashboard queda 100%.
      </div>
    </div>
  )
}
