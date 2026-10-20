'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { ExperimentoDeLaura } from '@/components/admin/ExperimentoDeLaura'

import type { PillTone } from '@/lib/admin/types'


const ESTADO_DEL_EXPERIMENTO: Record<string, string> = {
  running: 'En curso',
  paused: 'En pausa',
  completed: 'Terminado',
  draft: 'Borrador',
  archived: 'Archivado',
}

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

const SEGMENTOS: Segmento<ExperimentRow>[] = [
  { valor: 'todos', nombre: 'Todos', cumple: () => true },
  { valor: 'running', nombre: 'En curso', cumple: (e) => e.status === 'running' },
  { valor: 'paused', nombre: 'En pausa', cumple: (e) => e.status === 'paused' },
  { valor: 'otros', nombre: 'Terminados y otros', cumple: (e) => e.status !== 'running' && e.status !== 'paused' },
]

// ─── Columns ───────────────────────────────────────────────────────────────

const columns: Column<ExperimentRow>[] = [
  {
    header: 'Estado',
    orden: (r) => ESTADO_DEL_EXPERIMENTO[r.status] ?? r.status,
    texto: (r) => ESTADO_DEL_EXPERIMENTO[r.status] ?? r.status,
    cell: (r) => <Pill tone={statusTone(r.status)}>{ESTADO_DEL_EXPERIMENTO[r.status] ?? r.status}</Pill>,
  },
  {
    header: 'Experimento',
    orden: (r) => r.name,
    texto: (r) => r.name,
    cell: (r) => <span className="font-mono text-caption break-all">{r.name}</span>,
  },
  {
    header: 'Asignaciones',
    align: 'right',
    orden: (r) => Number(r.assignment_count) || 0,
    ordenPrimero: 'desc',
    texto: (r) => Number(r.assignment_count) || 0,
    cell: (r) => (
      <span className="tabular-nums font-mono text-caption">
        {(Number(r.assignment_count) || 0).toLocaleString('es-CO')}
      </span>
    ),
  },
  {
    header: 'Creado',
    orden: (r) => r.created_at,
    ordenPrimero: 'desc',
    texto: (r) => fmtDateTime(r.created_at),
    cell: (r) => (
      <span className="font-mono text-caption text-fg-muted tabular-nums whitespace-nowrap">
        {fmtDateTime(r.created_at)}
      </span>
    ),
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────

/** /ab-tests — Experiments (BACK.md §8.24 · FRONT.md §6.26). */
export default function AbTestsPage() {
  const { data, isLoading, error, refetch } = useApiQuery<ExperimentRow[]>(
    (signal) => adminApi('/experiments', { signal }),
    [],
  )

  const running = (data ?? []).filter((e) => e.status === 'running').length


  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Experimentos"
        description={
          data
            ? `Pruebas A/B de los agentes: dos formas de hacer algo y cuál funciona mejor. ${
                running === 1 ? 'Hay 1 en curso.' : `Hay ${running} en curso.`
              }`
            : 'Pruebas A/B de los agentes: dos formas de hacer algo y cuál funciona mejor.'
        }
      />

      {/* 07-10-2026 (Nico): el experimento de cómo Laura ofrece el acuerdo;
          aquí Leasefy lo empieza, lo pausa y aprueba la ganadora para todas. */}
      <ExperimentoDeLaura />

      <DataTable
        columns={columns}
        rows={data}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="Todavía no hay experimentos"
        emptyHint="Cuando un agente pruebe dos formas de hacer algo, aparece acá."
        aria-label="Experimentos"
        queSon={['experimento', 'experimentos']}
        buscar="Nombre del experimento"
        segmentos={SEGMENTOS}
        exportar="experimentos"
      />
    </div>
  )
}
