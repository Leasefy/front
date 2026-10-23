'use client'

import { useRouter } from 'next/navigation'
import { Robot } from '@phosphor-icons/react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { legible } from '@/lib/admin/textos-del-admin'

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
      orden: (r) => r.name,
      texto: (r) => r.name ?? 'Sin nombre',
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-fg">{r.name ?? 'Sin nombre'}</span>
          {r.default && <Pill tone="neutral">Principal</Pill>}
        </span>
      ),
    },
    {
      header: 'Modelo',
      orden: (r) => r.model?.model,
      texto: (r) => `${r.model?.provider ?? ''} / ${r.model?.model ?? ''}`,
      cell: (r) => (
        <span className="text-caption text-fg-muted">
          {r.model?.model ?? 'Sin modelo'}
          {r.model?.provider ? <span className="block">de {legible(r.model.provider)}</span> : null}
        </span>
      ),
    },
    {
      header: 'Voz',
      orden: (r) => r.voice?.provider,
      texto: (r) => (r.voice?.provider ? legible(r.voice.provider) : ''),
      cell: (r) => <span className="text-fg-muted">{r.voice?.provider ? legible(r.voice.provider) : '—'}</span>,
    },
    {
      header: 'Silencio',
      align: 'right',
      orden: (r) => r.silenceTimeoutSeconds,
      texto: (r) => r.silenceTimeoutSeconds,
      cell: (r) => (
        <span className="font-mono tabular-nums">
          {r.silenceTimeoutSeconds != null ? `${r.silenceTimeoutSeconds} s` : '—'}
        </span>
      ),
    },
    {
      header: 'Actualizado',
      orden: (r) => r.updatedAt,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.updatedAt),
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.updatedAt)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Agentes de voz"
        description="Las instrucciones de cada agente de voz. Toca uno para editarlas aquí, sin entrar a Vapi."
      />
      <DataTable
        columns={columns}
        rows={agents.data}
        getKey={(r) => r.id}
        isLoading={agents.isLoading}
        error={agents.error}
        emptyTitle="No hay agentes de voz"
        emptyHint="Si debería haber, revisa la conexión con Vapi en el servidor."
        emptyIcon={<Robot weight="duotone" />}
        onReintentar={agents.refetch}
        aria-label="Agentes de voz"
        onRowClick={(r) => router.push(`/admin/agents/${r.id}`)}
        queSon={['agente', 'agentes']}
        buscar="Nombre, modelo o voz"
        ordenInicial={{ columna: 4, sentido: 'desc' }}
        exportar="agentes-de-voz"
        masEnElExcel={[
          { header: 'ID', texto: (r) => r.id },
          { header: 'Proveedor del modelo', texto: (r) => r.model?.provider ?? '' },
        ]}
      />
    </div>
  )
}
