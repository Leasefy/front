'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

// ─── Types (co-located, per FRONT.md §6.26) ────────────────────────────────

/**
 * GET /api/v1/admin/experiments → ExperimentRow[] (bare array).
 * Ordered running > paused > other server-side (ADMIN-API-CONTRACT.md).
 *
 * Note: experiment_assignments has NO variant_key column (guard, commit 12b0b00).
 */
interface ExperimentRow {
  id: string
  name: string
  /** 'running' | 'paused' | any other string */
  status: string
  created_at: string
  /** Total assignment count from experiment_assignments (numeric string). */
  assignment_count: number | string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusTone(s: string): PillTone {
  if (s === 'running') return 'ok'
  if (s === 'paused')  return 'warn'
  return 'muted'
}

// ─── Columns ───────────────────────────────────────────────────────────────

const columns: Column<ExperimentRow>[] = [
  {
    header: 'Status',
    cell: (r) => <Pill tone={statusTone(r.status)}>{r.status}</Pill>,
  },
  {
    header: 'Experimento',
    cell: (r) => <span className="font-mono text-xs break-all">{r.name}</span>,
  },
  {
    header: 'Asignaciones',
    align: 'right',
    cell: (r) => (
      <span className="tabular-nums font-mono text-xs">
        {(Number(r.assignment_count) || 0).toLocaleString('es-CO')}
      </span>
    ),
  },
  {
    header: 'Creado',
    cell: (r) => (
      <span className="font-mono text-xs text-fg-muted tabular-nums whitespace-nowrap">
        {fmtDateTime(r.created_at)}
      </span>
    ),
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────

/** /ab-tests — Experiments (BACK.md §8.24 · FRONT.md §6.26). */
export default function AbTestsPage() {
  const { data, isLoading, error } = useApiQuery<ExperimentRow[]>(
    (signal) => adminApi('/experiments', { signal }),
    [],
  )

  const running = (data ?? []).filter((e) => e.status === 'running').length

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <PageHeader
        label="sistema"
        title="A/B tests"
        description={
          data
            ? `${running} corriendo · reporte detallado en /api/agency/[id]/experiments/[key]/report del agent service.`
            : 'Experimentos activos ordenados running > paused > otros.'
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        emptyTitle="Sin experiments"
        emptyHint="No hay experimentos creados aún."
      />
    </div>
  )
}
