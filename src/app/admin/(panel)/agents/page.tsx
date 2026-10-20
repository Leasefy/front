'use client'

import { useRouter } from 'next/navigation'
import { Robot } from '@phosphor-icons/react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'

/** Minimal Vapi assistant shape returned by GET /agents (BACK.md §8.2). */
interface Agent {
  id: string
  name?: string | null
  model?: { provider?: string | null; model?: string | null } | null
  voice?: { provider?: string | null } | null
  silenceTimeoutSeconds?: number | null
  updatedAt?: string | null
  /** Backend marks true when id === VAPI_ASSISTANT_ID. */
  default?: boolean
}

/** /admin/agents — Vapi assistant list (FRONT.md §6.2 · BACK.md §8.2). */
export default function AgentsPage() {
  const router = useRouter()
  const agents = useApiQuery<Agent[]>(
    (signal) => adminApi('/agents', { signal }),
    [],
  )

  const columns: Column<Agent>[] = [
    {
      header: 'Nombre',
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-fg">{r.name ?? 'Sin nombre'}</span>
          {r.default && <Pill tone="info">Principal</Pill>}
        </span>
      ),
    },
    {
      header: 'Modelo',
      cell: (r) => (
        <span className="font-mono text-fg-muted">
          {r.model?.provider ?? '—'} / {r.model?.model ?? '—'}
        </span>
      ),
    },
    {
      header: 'Voz',
      cell: (r) => <span className="text-fg-muted">{r.voice?.provider ?? '—'}</span>,
    },
    {
      header: 'Silencio',
      align: 'right',
      cell: (r) => (
        <span className="font-mono tabular-nums">
          {r.silenceTimeoutSeconds != null ? `${r.silenceTimeoutSeconds} s` : '—'}
        </span>
      ),
    },
    {
      header: 'Actualizado',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono tabular-nums text-fg-muted">{fmtDateTime(r.updatedAt)}</span>
      ),
    },
    {
      header: 'ID',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-caption text-fg-subtle">{r.id.slice(0, 8)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Agentes de voz"
        description="Las instrucciones de cada agente de voz (Vapi). Se editan acá, sin entrar al tablero de Vapi."
      />
      <DataTable
        columns={columns}
        rows={agents.data}
        getKey={(r) => r.id}
        isLoading={agents.isLoading}
        error={agents.error}
        emptyTitle="No hay agentes de voz"
        emptyHint="Si debería haber, revisa la llave de Vapi (VAPI_API_KEY) en el back."
        emptyIcon={<Robot weight="bold" />}
        onReintentar={agents.refetch}
        aria-label="Agentes de voz"
        onRowClick={(r) => router.push(`/admin/agents/${r.id}`)}
      />
    </div>
  )
}
