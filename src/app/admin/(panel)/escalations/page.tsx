'use client'

import Link from 'next/link'
import { Card, MonoLabel, Stagger, StaggerItem } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { urgencia } from '@/lib/admin/textos-del-admin'

// Board rows are a slim projection (LIMIT 200, bare array — no pagination
// envelope). Full detail (assignee, resolution, call) lives in /escalations/:id.
interface EscalationRow {
  id: string
  tenant_id: string
  debtor_id: string | null
  status: string
  urgency: string
  created_at: string
  debtor_name: string | null
  legal_name: string | null
}

function EscalationCard({ row }: { row: EscalationRow }) {
  const u = urgencia(row.urgency)
  return (
    <Link
      href={`/admin/escalations/${row.id}`}
      className="group block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card interactive className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <Pill tone={u.tono} dot>
            {u.nombre}
          </Pill>
          <MonoLabel className="whitespace-nowrap tabular-nums">{fmtDateTime(row.created_at)}</MonoLabel>
        </div>
        <div className="text-body-sm font-medium leading-snug text-fg">{row.debtor_name ?? 'Deudor sin nombre'}</div>
        <div className="truncate text-caption text-fg-muted">{row.legal_name ?? 'Sin inmobiliaria'}</div>
      </Card>
    </Link>
  )
}

function Columna({
  title,
  sub,
  rows,
  vacio,
  apagada = false,
}: {
  title: string
  sub: string
  rows: EscalationRow[]
  vacio: string
  apagada?: boolean
}) {
  return (
    <Card variant="muted" className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <div>
          <h2 className="text-body font-medium text-fg">{title}</h2>
          <p className="text-caption text-fg-subtle">{sub}</p>
        </div>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface px-2 font-mono text-caption tabular-nums text-fg">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-body-sm text-fg-muted">{vacio}</p>
      ) : (
        <Stagger className={`space-y-2 ${apagada ? 'opacity-75' : ''}`}>
          {rows.map((r) => (
            <StaggerItem key={r.id}>
              <EscalationCard row={r} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Card>
  )
}

/** /admin/escalations — tablero de 3 columnas (FRONT.md §6.13 · BACK.md §8.11). */
export default function EscalationsPage() {
  // El tablero devuelve un arreglo pelado (LIMIT 200), no un sobre { data }.
  const { data, isLoading, error, refetch } = useApiQuery<EscalationRow[]>(
    (signal) => adminApi('/escalations', { signal }),
    [],
  )

  const rows = data ?? []
  const open = rows.filter((r) => r.status === 'open')
  const assigned = rows.filter((r) => r.status === 'assigned')
  const resolved = rows.filter((r) => r.status === 'resolved')

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Escalaciones"
        description={
          !isLoading && !error
            ? `${open.length} ${open.length === 1 ? 'abierta' : 'abiertas'} · ${assigned.length} en curso · ${resolved.length} resueltas en 7 días. Primero lo más urgente.`
            : 'Los casos que un agente le pasó a una persona: abiertos, en curso y resueltos en los últimos 7 días.'
        }
      />

      {isLoading ? (
        <LoadingBlock filas={6} />
      ) : error ? (
        <ErrorBlock error={error} onReintentar={refetch} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <Columna title="Abiertas" sub="Sin nadie asignado" rows={open} vacio="Nada abierto. Bien." />
          <Columna title="En curso" sub="Alguien las tiene" rows={assigned} vacio="Nadie está atendiendo una ahora." />
          <Columna title="Resueltas" sub="Últimos 7 días" rows={resolved} vacio="Ninguna resuelta esta semana." apagada />
        </div>
      )}
    </div>
  )
}
