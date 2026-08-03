'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import type { Paginated } from '@/lib/admin/types'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { ErrorBlock } from '@/components/admin/screen/states'
import type { PillTone } from '@/lib/admin/types'

const PAGE_SIZE = 50

// ---------- Stage constants (BACK.md §7.1) ----------

const CARTERA_STAGES = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX'] as const
type CarteraStage = (typeof CARTERA_STAGES)[number]
type StageTone = Extract<PillTone, 'ok' | 'neutral' | 'warn' | 'bad' | 'muted'>

const STAGE_LABEL_ES: Record<CarteraStage, string> = {
  S0: 'Pre-vencimiento',
  S1: 'Cartera fresca',
  S2: 'Mora administrativa',
  S3: 'Mora pre-jurídica',
  S4: 'Siniestro inmobiliario',
  S5: 'Restitución / jurídico',
  SX: 'Skip / Abandono',
}

const STAGE_HINT_ES: Record<CarteraStage, string> = {
  S0: 'día < 0',
  S1: 'día 1..15',
  S2: 'día 16..45',
  S3: 'día 46..89',
  S4: 'reclamo seguro',
  S5: '≥ 90d, sin póliza',
  SX: 'cualquier edad',
}

const STAGE_TONE: Record<CarteraStage, StageTone> = {
  S0: 'ok',
  S1: 'neutral',
  S2: 'warn',
  S3: 'warn',
  S4: 'bad',
  S5: 'bad',
  SX: 'muted',
}

function isCarteraStage(v: string): v is CarteraStage {
  return (CARTERA_STAGES as readonly string[]).includes(v)
}

// ---------- Types ----------

interface DebtorInStage {
  debtor_id: string
  full_name: string | null
  document_number: string | null
  phone_primary: string | null
  tenant_id: string
  legal_name: string | null
  stage_entered_at: string
  previous_stage: string | null
  transition_reason: string
  days_in_state: string // numeric as text, e.g. "14.5"
  next_planned_for: string | null
  next_channel: string | null
}

/**
 * Response for GET /cartera/:stage (docs/ADMIN-API-CONTRACT.md):
 * standard Paginated envelope + stage stats + tenants[] for the filter select.
 */
interface CarteraStageResponse extends Paginated<DebtorInStage> {
  stats: {
    n: string
    avg_days_in_state: string | null
    oldest_entered_at: string | null
  }
  tenants: Array<{ tenant_id: string; legal_name: string }>
}

// ---------- Heat color for days-in-state ----------

function daysClass(days: number): string {
  if (days >= 30) return 'text-bad'
  if (days >= 14) return 'text-warn'
  return 'text-fg'
}

// ---------- Page ----------

/** /cartera/:stage — stage detail (BACK.md §8.6 · FRONT.md §6.10). Paginated, oldest-first. */
export default function CarteraStagePage() {
  const params = useParams<{ stage: string }>()
  const rawStage = (params.stage ?? '').toUpperCase()

  const { get, page, setFilters, setPage } = useUrlFilters()
  const tenant = get('tenant')

  const isValid = isCarteraStage(rawStage)
  const stage = isValid ? rawStage : null

  const result = useApiQuery<CarteraStageResponse>(
    (signal) =>
      adminApi(`/cartera/${stage}`, { query: { tenant, page }, signal }),
    [stage, tenant, page],
    isValid,
  )

  // Invalid stage — client-side guard (FRONT.md §6.10)
  if (!isValid) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorBlock
          error={`Stage inválido: "${params.stage}". Valores válidos: ${CARTERA_STAGES.join(', ')}.`}
        />
      </div>
    )
  }

  const tone = STAGE_TONE[stage!]
  const stageTenants = result.data?.tenants ?? []
  const showFilter = stageTenants.length > 1

  const columns: Column<DebtorInStage>[] = [
    {
      header: 'Deudor',
      cell: (r) => (
        <div>
          <div className="font-medium text-fg truncate max-w-[200px]">
            {r.full_name ?? <span className="text-fg-subtle">—</span>}
          </div>
          {r.document_number && (
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              CC {r.document_number}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Inmobiliaria',
      cell: (r) => (
        <span className="text-xs text-fg-muted truncate max-w-[180px]">
          {r.legal_name ?? '—'}
        </span>
      ),
    },
    {
      header: 'Vino de',
      cell: (r) => (
        <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
          {r.previous_stage ?? <span className="italic">inicial</span>}
        </span>
      ),
    },
    {
      header: 'Días en stage',
      align: 'right',
      cell: (r) => {
        const days = parseFloat(r.days_in_state)
        return (
          <span className={`tabular-nums font-mono text-sm ${daysClass(days)}`}>
            {days.toFixed(1)}
          </span>
        )
      },
    },
    {
      header: 'Entró',
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-fg-muted tabular-nums">
          {fmtDateTime(r.stage_entered_at)}
        </span>
      ),
    },
    {
      header: 'Próxima acción',
      cell: (r) =>
        r.next_planned_for ? (
          <div>
            <div className="text-xs text-fg-muted tabular-nums">
              {fmtDateTime(r.next_planned_for)}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              {r.next_channel ?? '—'}
            </div>
          </div>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Motivo',
      cell: (r) => (
        <span className="font-mono text-[11px] text-fg-muted max-w-[240px] truncate">
          {r.transition_reason}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PageHeader
        label={`05 · cartera · ${stage}`}
        title={STAGE_LABEL_ES[stage!]}
        description={`${STAGE_HINT_ES[stage!]} · deudores ordenados por tiempo en stage (más viejos primero).`}
        right={
          <Link href="/admin/cartera" className="btn">
            ← Cartera
          </Link>
        }
      />

      {/* Tenant filter — only when >1 agency has debtors in this stage */}
      {showFilter && (
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="block">
            <span className="block mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              inmobiliaria
            </span>
            <select
              className="input w-56"
              value={tenant}
              onChange={(e) => setFilters({ tenant: e.target.value }, { resetPage: true })}
            >
              <option value="">— todas —</option>
              {stageTenants.map((t) => (
                <option key={t.tenant_id} value={t.tenant_id}>
                  {t.legal_name}
                </option>
              ))}
            </select>
          </label>
          {tenant && (
            <button
              className="btn"
              onClick={() => setFilters({ tenant: '' }, { resetPage: true })}
            >
              × limpiar
            </button>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.debtor_id}
        isLoading={result.isLoading}
        error={result.error}
        emptyTitle={`Sin deudores en ${stage}`}
        emptyHint={tenant ? 'Probá quitando el filtro de inmobiliaria.' : undefined}
      />

      {result.data && (
        <Pagination
          page={page}
          total={result.data.total}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      )}
    </div>
  )
}
