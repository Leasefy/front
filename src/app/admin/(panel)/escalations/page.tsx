'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, FranjaDeCifras, MonoLabel, SegmentedControl, Stagger, StaggerItem } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
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

const ESTADO: Record<string, { nombre: string; tono: 'bad' | 'info' | 'muted' }> = {
  open: { nombre: 'Abierta', tono: 'bad' },
  assigned: { nombre: 'En curso', tono: 'info' },
  resolved: { nombre: 'Resuelta', tono: 'muted' },
}
const RANGO_DE_URGENCIA: Record<string, number> = { live: 0, high: 1, medium: 2, low: 3 }

/**
 * /admin/escalations — los casos que un agente le pasó a una persona (FRONT.md
 * §6.13 · BACK.md §8.11). 20-10-2026: tabla de la plataforma por defecto
 * (buscar, pestañas, orden, Excel) y el tablero de 3 columnas como otra vista.
 */
export default function EscalationsPage() {
  const router = useRouter()
  const { get, setFilters } = useUrlFilters()
  const vista = get('ver') === 'tablero' ? 'tablero' : 'tabla'
  const { data, isLoading, error, refetch } = useApiQuery<EscalationRow[]>(
    (signal) => adminApi('/escalations', { signal }),
    [],
  )

  const rows = data ?? []
  const open = rows.filter((r) => r.status === 'open')
  const assigned = rows.filter((r) => r.status === 'assigned')
  const resolved = rows.filter((r) => r.status === 'resolved')

  const columnas: Column<EscalationRow>[] = [
    {
      header: 'Urgencia',
      orden: (r) => RANGO_DE_URGENCIA[r.urgency] ?? 9,
      texto: (r) => urgencia(r.urgency).nombre,
      cell: (r) => {
        const u = urgencia(r.urgency)
        return (
          <Pill tone={u.tono} dot>
            {u.nombre}
          </Pill>
        )
      },
    },
    {
      header: 'Deudor',
      orden: (r) => r.debtor_name,
      texto: (r) => r.debtor_name ?? 'Deudor sin nombre',
      cell: (r) => <span className="font-medium text-fg">{r.debtor_name ?? 'Deudor sin nombre'}</span>,
    },
    {
      header: 'Inmobiliaria',
      orden: (r) => r.legal_name,
      texto: (r) => r.legal_name ?? 'Sin inmobiliaria',
      cell: (r) => <span className="text-fg-muted">{r.legal_name ?? 'Sin inmobiliaria'}</span>,
    },
    {
      header: 'Estado',
      orden: (r) => r.status,
      texto: (r) => (ESTADO[r.status] ?? { nombre: r.status }).nombre,
      cell: (r) => {
        const e = ESTADO[r.status] ?? { nombre: r.status, tono: 'muted' as const }
        return <Pill tone={e.tono}>{e.nombre}</Pill>
      },
    },
    {
      header: 'Desde',
      align: 'right',
      orden: (r) => r.created_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.created_at),
      cell: (r) => <span className="whitespace-nowrap text-caption tabular-nums text-fg-muted">{fmtDateTime(r.created_at)}</span>,
    },
  ]

  const cambiarVista = (
    <SegmentedControl<'tabla' | 'tablero'>
      size="sm"
      aria-label="Cómo verlas"
      value={vista}
      onChange={(v) => setFilters({ ver: v === 'tablero' ? 'tablero' : undefined })}
      options={[
        { value: 'tabla', label: 'Tabla' },
        { value: 'tablero', label: 'Tablero' },
      ]}
    />
  )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Escalaciones"
        description="Los casos que un agente le pasó a una persona: abiertos, en curso y resueltos en los últimos 7 días. Toca uno para tomarlo o resolverlo."
        right={cambiarVista}
      />

      <FranjaDeCifras fila="lg" aria-label="Cifras de las escalaciones">
        <KpiCard label="Abiertas" value={data ? open.length : '—'} tone={open.length ? 'bad' : 'default'} hint="Sin nadie asignado" />
        <KpiCard label="En curso" value={data ? assigned.length : '—'} hint="Alguien las tiene" />
        <KpiCard label="Resueltas" value={data ? resolved.length : '—'} tone="ok" hint="Últimos 7 días" />
      </FranjaDeCifras>

      {vista === 'tabla' ? (
        <DataTable
          columns={columnas}
          rows={data}
          getKey={(r) => r.id}
          isLoading={isLoading}
          error={error}
          onReintentar={refetch}
          emptyTitle="No hay escalaciones"
          emptyHint="Cuando un agente le pase un caso a una persona, aparece aquí."
          aria-label="Escalaciones"
          onRowClick={(r) => router.push(`/admin/escalations/${r.id}`)}
          queSon={['escalación', 'escalaciones']}
          buscar="Deudor o inmobiliaria"
          segmentos={[
            { valor: 'pendientes', nombre: 'Por atender', cumple: (r) => r.status !== 'resolved' },
            { valor: 'open', nombre: 'Abiertas', cumple: (r) => r.status === 'open' },
            { valor: 'assigned', nombre: 'En curso', cumple: (r) => r.status === 'assigned' },
            { valor: 'resolved', nombre: 'Resueltas', cumple: (r) => r.status === 'resolved' },
            { valor: 'todas', nombre: 'Todas', cumple: () => true },
          ]}
          ordenInicial={{ columna: 0, sentido: 'asc' }}
          exportar="escalaciones"
        />
      ) : isLoading ? (
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
