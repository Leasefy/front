'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtFecha } from '@/lib/admin/format'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { estadoDelExperimento } from '@/lib/admin/textos-del-admin'
import { Pill } from '@/components/admin/Pill'
import { ExperimentoDeLaura } from '@/components/admin/ExperimentoDeLaura'

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

const SEGMENTOS: Segmento<ExperimentRow>[] = [
  { valor: 'todos', nombre: 'Todos', cumple: () => true },
  { valor: 'running', nombre: 'En curso', cumple: (e) => e.status === 'running' },
  { valor: 'paused', nombre: 'En pausa', cumple: (e) => e.status === 'paused' },
  { valor: 'otros', nombre: 'Terminados y otros', cumple: (e) => e.status !== 'running' && e.status !== 'paused' },
]

// ─── Columns ───────────────────────────────────────────────────────────────

// Ronda 26 (revisora r25): primero lo que identifica (el experimento), después su estado.
const columns: Column<ExperimentRow>[] = [
  {
    header: 'Experimento',
    orden: (r) => r.name,
    texto: (r) => r.name,
    cell: (r) => <span className="break-words text-body-sm font-medium text-fg">{r.name}</span>,
  },
  {
    header: 'Estado',
    orden: (r) => estadoDelExperimento(r.status),
    texto: (r) => estadoDelExperimento(r.status),
    cell: (r) => <Pill tone={statusTone(r.status)}>{estadoDelExperimento(r.status)}</Pill>,
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
    texto: (r) => fmtFecha(r.created_at),
    cell: (r) => (
      <span className="font-mono text-caption text-fg-muted tabular-nums whitespace-nowrap">
        {fmtFecha(r.created_at)}
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
        description="Dos formas de hacer algo en los agentes, y cuál funciona mejor."
        // Ronda 26 (revisora r25): «0 en curso» no informa; la insignia sólo con alguno corriendo.
        junto={
          running > 0 ? (
            <Pill tone="ok" dot>
              {running === 1 ? '1 en curso' : `${running} en curso`}
            </Pill>
          ) : null
        }
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Los experimentos" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Un experimento reparte a las personas entre dos variantes: dos formas de hacer lo mismo (por ejemplo,
                cómo Laura ofrece un acuerdo de pago). Cada persona queda en una sola variante; esa es su asignación.
              </p>
              <p>
                Mientras corre, se mide qué variante funciona mejor. Cuando la diferencia ya se sostiene, Leasefy
                aprueba la ganadora y desde ahí se usa para todas las inmobiliarias. Un experimento en pausa no
                reparte a nadie nuevo.
              </p>
            </div>
          </ParaEntenderMas>
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
        emptyHint="Cuando un agente pruebe dos formas de hacer algo, aparece aquí."
        aria-label="Experimentos"
        queSon={['experimento', 'experimentos']}
        buscar="Nombre del experimento"
        segmentos={SEGMENTOS}
        exportar="experimentos"
      />
    </div>
  )
}
