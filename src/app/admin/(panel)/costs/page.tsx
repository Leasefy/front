'use client'

import { useRouter } from 'next/navigation'
import { ChatCircleDots, Coins, Robot, Waveform } from '@phosphor-icons/react'
import { Alert, MonoLabel } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { useClientPagination } from '@/lib/admin/use-client-pagination'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'

const PAGE_SIZE = 50

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

const usd = (n: number, decimales = 2) =>
  `US$ ${n.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`

function DailyStackedBars({ daily }: { daily: DailyRow[] }) {
  if (daily.length === 0) return <p className="text-body-sm text-fg-muted">Todavía no hay datos.</p>

  const vapiVals = daily.map((d) => num(d.vapi_cost_usd))
  const claudeVals = daily.map((d) => num(d.claude_cost_usd))
  const totals = vapiVals.map((v, i) => v + (claudeVals[i] ?? 0))
  const max = Math.max(...totals, 0.001)

  const vapiTotal = vapiVals.reduce((a, b) => a + b, 0)
  const claudeTotal = claudeVals.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-caption text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-primary" /> Vapi · {usd(vapiTotal)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-primary/35" /> Claude · {usd(claudeTotal)}
        </span>
      </div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Costo diario de los últimos ${daily.length} días`}>
        {totals.map((t, i) => {
          const v = vapiVals[i] ?? 0
          const c = claudeVals[i] ?? 0
          return (
            <div
              key={i}
              className="flex flex-1 flex-col justify-end gap-px overflow-hidden rounded-t-[6px]"
              title={`${daily[i]?.day?.slice(5)}: Vapi ${usd(v, 4)} · Claude ${usd(c, 4)}`}
            >
              {c > 0 && <div className="bg-primary/35" style={{ height: `${Math.max(1, (c / max) * 100)}%` }} />}
              {v > 0 && <div className="bg-primary" style={{ height: `${Math.max(1, (v / max) * 100)}%` }} />}
              {t === 0 && <div className="h-0.5 bg-border" />}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between font-mono text-caption text-fg-subtle">
        <span>{daily[0]?.day?.slice(5)}</span>
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
  /* Una fila por agencia ⇒ crece con el negocio. El mix por modelo de abajo NO
     se pagina: es el conjunto cerrado de modelos LLM en uso. */
  const perTenantPaging = useClientPagination(perTenant, PAGE_SIZE)
  const daily = costs.data?.dailySeries ?? []
  const modelMix = costs.data?.modelMix ?? []

  const vapiMtdUsd = num(mtd?.vapi_cost_usd_mtd)
  const claudeMtdUsd = num(mtd?.claude_cost_usd_mtd)
  const vapiMtdCop = num(mtd?.vapi_cost_cop_mtd)
  const claudeMtdCop = num(mtd?.claude_cost_cop_mtd)
  const totalCostCop = num(mtd?.total_cost_cop_mtd)

  // Per-tenant columns

  const tenantColumns: Column<PerTenantRow>[] = [
    { header: 'Inmobiliaria', cell: (r) => <span className="font-medium">{r.legal_name}</span> },
    { header: 'Vapi', align: 'right', cell: (r) => <span className="font-mono tabular-nums">{usd(num(r.vapi_cost_usd))}</span> },
    { header: 'Claude', align: 'right', cell: (r) => <span className="font-mono tabular-nums">{usd(num(r.claude_cost_usd))}</span> },
    { header: 'Total', align: 'right', cell: (r) => <span className="font-mono font-medium tabular-nums">{usd(num(r.total_cost_usd))}</span> },
    {
      header: 'Total en pesos',
      align: 'right',
      cell: (r) => {
        const totalCop = num(r.total_cost_cop)
        return <span className="font-mono tabular-nums text-fg-muted">{totalCop > 0 ? fmtCOP(totalCop) : '—'}</span>
      },
    },
  ]

  const modelColumns: Column<ModelMixRow>[] = [
    { header: 'Modelo', cell: (r) => <span className="font-mono text-caption">{r.model_used}</span> },
    { header: 'Usos', align: 'right', cell: (r) => <span className="font-mono tabular-nums">{num(r.count).toLocaleString('es-CO')}</span> },
    { header: 'Costo', align: 'right', cell: (r) => <span className="font-mono tabular-nums">{usd(num(r.cost_usd), 4)}</span> },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Costos"
        description="Lo que cuesta operar la plataforma este mes: voz (Vapi) y modelo (Claude). WhatsApp todavía no se mide."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del mes">
        <KpiCard icon={<Waveform />} label="Vapi · este mes" value={usd(vapiMtdUsd)} hint={fmtCOP(vapiMtdCop)} />
        <KpiCard icon={<Robot />} label="Claude · este mes" value={usd(claudeMtdUsd)} hint={fmtCOP(claudeMtdCop)} />
        <KpiCard icon={<ChatCircleDots />} label="WhatsApp · este mes" value="—" hint="Todavía no se mide" />
        <KpiCard icon={<Coins />} label="Total · este mes" value={totalCostCop > 0 ? fmtCOP(totalCostCop) : '—'} hint="Vapi y Claude, en pesos" />
      </section>

      <section className="space-y-3" aria-label="Por inmobiliaria">
        <MonoLabel className="block">Por inmobiliaria</MonoLabel>
        <DataTable
          columns={tenantColumns}
          rows={perTenantPaging.pageRows}
          getKey={(r) => r.tenant_id}
          isLoading={costs.isLoading}
          error={costs.error}
          onReintentar={costs.refetch}
          emptyTitle="Todavía no hay costos este mes"
          emptyIcon={<Coins weight="bold" />}
          aria-label="Costos por inmobiliaria"
          onRowClick={(r) => router.push(`/admin/tenants/${r.tenant_id}`)}
          pie={
            <Pagination
              page={perTenantPaging.page}
              total={perTenantPaging.total}
              pageSize={PAGE_SIZE}
              onPage={perTenantPaging.setPage}
            />
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="space-y-3" aria-label="Por modelo">
          <MonoLabel className="block">Por modelo · este mes</MonoLabel>
          <DataTable
            columns={modelColumns}
            rows={modelMix}
            getKey={(r, i) => r.model_used ?? String(i)}
            isLoading={costs.isLoading}
            error={costs.error}
            emptyTitle="No se usó ningún modelo este mes"
            aria-label="Costos por modelo"
          />
        </section>

        <Tarjeta titulo="Últimos 14 días" descripcion="Vapi y Claude, en dólares.">
          <DailyStackedBars daily={daily} />
        </Tarjeta>
      </div>

      <Alert variant="info" role="note" title="Falta WhatsApp">
        El costo por mensaje de WhatsApp (360dialog) todavía no se registra en el micro. Cuando se registre, este
        tablero queda completo.
      </Alert>
    </div>
  )
}
