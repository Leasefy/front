'use client'

import { useState } from 'react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { useClientPagination } from '@/lib/admin/use-client-pagination'
import { Pill } from '@/components/admin/Pill'
import { EditarModeloDeCobro } from '@/components/admin/EditarModeloDeCobro'
import { NOMBRE_DEL_MODELO, fraccionAPorcentaje, type ModeloDeCobro } from '@/lib/admin/modelo-de-cobro'

const PAGE_SIZE = 50
import type { PillTone } from '@/lib/admin/types'

// ── Types co-located with the screen (BACK.md §8.20 · FRONT.md §6.31) ─────────

/**
 * One row = one agency with its agency_policies left-joined.
 * All numeric money fields arrive as numeric strings (API returns raw, SPA formats).
 * allowed_payment_plans is a JSONB column — typed as unknown since not rendered.
 */
interface PolicyRow {
  tenant_id: string
  legal_name: string
  /** 'standard' | 'performance' | 'hybrid' | null */
  billing_model: string | null
  success_fee_pct: string | null
  monthly_min: string | null
  per_deudor: string | null
  base_fee: string | null
  hybrid_pct: string | null
  max_discount: string | null
  max_plan_months: number | string | null
  negotiation_max_attempts: number | string | null
  allowed_payment_plans: unknown
  debtors_count: string
  /** SUM(payments.amount) WHERE status='approved' AND paid_at >= NOW()-30d */
  recovered_30d: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(s: string | number | null | undefined): number {
  if (s == null) return 0
  const n = typeof s === 'number' ? s : parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/**
 * Client-side monthly fee projection by billing model (BACK.md §8.20 · §7.5).
 * formula is shown as a tooltip on the projected value.
 */
function projectMonthlyFee(p: PolicyRow): { value: number | null; formula: string } {
  const recovered = num(p.recovered_30d)
  const debtors   = num(p.debtors_count)
  const minCop    = num(p.monthly_min)

  if (!p.billing_model) return { value: null, formula: '—' }

  switch (p.billing_model) {
    case 'standard': {
      const perDeudor = num(p.per_deudor)
      const calc = Math.max(minCop, debtors * perDeudor)
      return {
        value: calc,
        formula: `max(${fmtCOP(minCop)}, ${debtors} × ${fmtCOP(perDeudor)})`,
      }
    }
    case 'performance': {
      // La política guarda la FRACCIÓN (0,08 = 8 %): antes se dividía otra vez
      // por 100 y la proyección salía cien veces menor.
      const pct  = num(p.success_fee_pct)
      const calc = Math.max(minCop, recovered * pct)
      return {
        value: calc,
        formula: `max(${fmtCOP(minCop)}, ${(pct * 100).toFixed(1)}% × ${fmtCOP(recovered)})`,
      }
    }
    case 'hybrid': {
      const base = num(p.base_fee)
      const pct  = num(p.hybrid_pct)
      const calc = Math.max(minCop, base + recovered * pct)
      return {
        value: calc,
        formula: `max(${fmtCOP(minCop)}, ${fmtCOP(base)} + ${(pct * 100).toFixed(1)}% × ${fmtCOP(recovered)})`,
      }
    }
    default:
      return { value: null, formula: '—' }
  }
}

function modelTone(model: string | null): PillTone {
  if (!model) return 'warn'
  return model === 'performance' ? 'ok' : model === 'standard' ? 'info' : 'neutral'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** /pricing-config — modelo de cobro por agencia, read-only (BACK.md §8.20 · FRONT.md §6.31). */
/** «0.0800» → «8 %» (la política guarda la fracción). */
function pct(fraccion: string | null): string {
  return fraccion != null ? `${fraccionAPorcentaje(fraccion)} %` : '—'
}

export default function PricingConfigPage() {
  const { data: rows, isLoading, error, refetch } = useApiQuery<PolicyRow[]>(
    (signal) => adminApi('/pricing-config', { signal }),
    [],
  )
  /**
   * 🔴 El modelo de cobro lo cambia SÓLO Leasefy, desde acá (Nico,
   * 04-10-2026); la inmobiliaria lo ve en sólo lectura en Configuración de
   * cobranza y el micro le rechaza el cambio.
   */
  const [editando, setEditando] = useState<PolicyRow | null>(null)

  /* Una fila por agencia: crece con cada alta. Los KPIs y la proyección de
     abajo siguen contando sobre `rows` entero, no sobre la página visible. */
  const { page, setPage, total, pageRows } = useClientPagination(rows, PAGE_SIZE)

  const byModel = {
    standard:    (rows ?? []).filter((r) => r.billing_model === 'standard').length,
    performance: (rows ?? []).filter((r) => r.billing_model === 'performance').length,
    hybrid:      (rows ?? []).filter((r) => r.billing_model === 'hybrid').length,
    none:        (rows ?? []).filter((r) => !r.billing_model).length,
  }

  const totalProjected = (rows ?? []).reduce(
    (sum, r) => sum + (projectMonthlyFee(r).value ?? 0),
    0,
  )

  const columns: Column<PolicyRow>[] = [
    {
      header: 'Agencia',
      cell: (r) => (
        <div>
          <div className="font-medium text-fg">{r.legal_name}</div>
          <div className="font-mono text-[10px] text-fg-subtle">
            {num(r.debtors_count)} deudores · máx {pct(r.max_discount)} desc ·{' '}
            máx {r.max_plan_months ?? '—'} cuotas · {r.negotiation_max_attempts ?? '—'} intentos
          </div>
        </div>
      ),
    },
    {
      header: 'Modelo',
      cell: (r) => (
        <Pill tone={modelTone(r.billing_model)}>
          {r.billing_model && r.billing_model in NOMBRE_DEL_MODELO
            ? NOMBRE_DEL_MODELO[r.billing_model as ModeloDeCobro]
            : r.billing_model ?? 'sin política'}
        </Pill>
      ),
    },
    {
      header: 'Success %',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">
          {pct(r.success_fee_pct)}
        </span>
      ),
    },
    {
      header: 'Min mes',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">
          {r.monthly_min ? fmtCOP(num(r.monthly_min)) : '—'}
        </span>
      ),
    },
    {
      header: 'Per deudor',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">
          {r.per_deudor ? fmtCOP(num(r.per_deudor)) : '—'}
        </span>
      ),
    },
    {
      header: 'Base hybrid',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">
          {r.base_fee ? fmtCOP(num(r.base_fee)) : '—'}
        </span>
      ),
    },
    {
      header: 'Hybrid %',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">
          {pct(r.hybrid_pct)}
        </span>
      ),
    },
    {
      header: 'Recaudo 30d',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs text-ok">
          {r.recovered_30d ? fmtCOP(num(r.recovered_30d)) : '—'}
        </span>
      ),
    },
    {
      header: 'Fee proyect',
      align: 'right',
      cell: (r) => {
        const proj = projectMonthlyFee(r)
        return proj.value != null ? (
          <div title={proj.formula}>
            <div className="tabular-nums font-mono text-xs text-brand">
              {fmtCOP(proj.value)}
            </div>
            <div
              className="font-mono text-[9px] text-fg-subtle truncate"
              style={{ maxWidth: '180px' }}
            >
              {proj.formula}
            </div>
          </div>
        ) : (
          <span className="text-xs text-fg-subtle">—</span>
        )
      },
    },
    {
      header: '',
      align: 'right',
      cell: (r) =>
        r.billing_model ? (
          <button
            type="button"
            className="btn"
            onClick={() => setEditando(r)}
            data-testid={`editar-modelo-${r.tenant_id}`}
          >
            Cambiar
          </button>
        ) : null,
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="26 · pricing"
        title="Modelo de pricing por agencia"
        description="Cómo le cobra Leasefy a cada inmobiliaria. Sólo Leasefy lo cambia (la inmobiliaria lo ve en sólo lectura); cada cambio queda en el registro con quién, cuándo y de qué a qué. Proyección calculada en el navegador."
      />

      <div className="grid grid-cols-5 gap-3 mb-8">
        <KpiCard label="Total agencias"  value={rows?.length ?? 0} />
        <KpiCard label="Standard"        value={byModel.standard} />
        <KpiCard label="Performance"     value={byModel.performance} tone="ok" />
        <KpiCard label="Hybrid"          value={byModel.hybrid} />
        <KpiCard
          label="Sin policy"
          value={byModel.none}
          tone={byModel.none > 0 ? 'warn' : 'default'}
        />
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getKey={(r) => r.tenant_id}
        isLoading={isLoading}
        error={error}
        emptyTitle="Sin agencias"
      />

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />

      {rows && rows.length > 0 && (
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle text-right mt-3">
          Proyección total mes:{' '}
          <span className="text-brand">{fmtCOP(totalProjected)}</span>
        </div>
      )}

      {editando && (
        <EditarModeloDeCobro
          key={editando.tenant_id}
          actual={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
