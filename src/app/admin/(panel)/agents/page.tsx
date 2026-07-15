'use client'

import { useRouter } from 'next/navigation'
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
          <span className="font-medium text-fg">{r.name ?? '(sin nombre)'}</span>
          {r.default && <Pill tone="info">default</Pill>}
        </span>
      ),
    },
    {
      header: 'Modelo',
      cell: (r) => (
        <span className="text-fg-muted">
          {r.model?.provider ?? '—'} / {r.model?.model ?? '—'}
        </span>
      ),
    },
    {
      header: 'Voz',
      cell: (r) => r.voice?.provider ?? '—',
    },
    {
      header: 'Silencio',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums">
          {r.silenceTimeoutSeconds != null ? `${r.silenceTimeoutSeconds}s` : '—'}
        </span>
      ),
    },
    {
      header: 'Actualizado',
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums">{fmtDateTime(r.updatedAt)}</span>
      ),
    },
    {
      header: 'ID',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs text-fg-subtle">{r.id.slice(0, 8)}</span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="agentes"
        title="Vapi assistants"
        description="Editá el system prompt de cada agente sin tocar el dashboard de Vapi."
      />
      <DataTable
        columns={columns}
        rows={agents.data}
        getKey={(r) => r.id}
        isLoading={agents.isLoading}
        error={agents.error}
        emptyTitle="Sin agentes"
        emptyHint="Verificá VAPI_API_KEY en el backend."
        onRowClick={(r) => router.push(`/admin/agents/${r.id}`)}
      />
    </div>
  )
}
