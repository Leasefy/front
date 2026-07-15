'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminApi, ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDateTime, fmtDuration } from '@/lib/admin/format'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'

// ---------- Types ----------

interface CounterRow {
  label: string
  value: string
}

interface RecentCall {
  id: string
  initiated_at: string
  outcome: string | null
  duration_seconds: number | null
  debtor_name: string
}

interface RecentEvent {
  id: string
  event_type: string
  timestamp: string
}

/**
 * Response shape for GET /tenants/:tenantId (docs/ADMIN-API-CONTRACT.md):
 * nested `agency` object + counters [{label, value}] + recentCalls/recentEvents (8 each).
 */
interface TenantAgency {
  agency_id: string
  tenant_id: string
  legal_name: string
  nit: string
  billing_model: string
  primary_contact_email: string
  primary_contact_phone?: string | null
  created_at: string
}

interface TenantDetail {
  agency: TenantAgency
  counters: CounterRow[]
  recentCalls: RecentCall[]
  recentEvents: RecentEvent[]
}

/** Counters whose value is a COP amount (the rest are plain counts). */
const MONEY_COUNTERS = new Set(['paid_total'])

// ---------- Sub-components ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className="tabular-nums font-mono text-fg">{children}</span>
    </div>
  )
}

// ---------- Page ----------

/** /tenants/:tenantId — agency detail (BACK.md §8.3 · FRONT.md §6.5). */
export default function TenantDetailPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params.tenantId

  const { data, isLoading, error } = useApiQuery<TenantDetail>(
    (signal) => adminApi(`/tenants/${tenantId}`, { signal }),
    [tenantId],
  )

  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>

  // 404 — agency not found
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-fg">Agencia no encontrada</p>
          <p className="text-xs text-fg-muted mt-1">
            El tenant <span className="font-mono">{tenantId}</span> no existe en la base.
          </p>
          <Link href="/admin/tenants" className="btn mt-4 inline-flex">
            ← Volver a Inmobiliarias
          </Link>
        </div>
      </div>
    )
  }

  if (error) return <div className="p-6 lg:p-8"><ErrorBlock error={error} /></div>
  if (!data) return null

  const callColumns: Column<RecentCall>[] = [
    {
      header: 'Deudor',
      cell: (r) => (
        <Link
          href={`/admin/calls/${r.id}`}
          className="text-fg hover:text-brand transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {r.debtor_name}
        </Link>
      ),
    },
    {
      header: 'Outcome',
      cell: (r) => (
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
          {r.outcome ?? '—'}
        </span>
      ),
    },
    {
      header: 'Duración',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums text-xs text-fg-muted">
          {fmtDuration(r.duration_seconds)}
        </span>
      ),
    },
    {
      header: 'Inicio',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-fg-subtle tabular-nums">
          {fmtDateTime(r.initiated_at)}
        </span>
      ),
    },
  ]

  const eventColumns: Column<RecentEvent>[] = [
    {
      header: 'Evento',
      cell: (r) => (
        <span className="font-mono text-xs text-fg">{r.event_type}</span>
      ),
    },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-fg-subtle tabular-nums">
          {fmtDateTime(r.timestamp)}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-8">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/tenants"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-fg"
        >
          ← Inmobiliarias
        </Link>
        <h1 className="font-display text-display tracking-tight text-fg mt-2">
          {data.agency.legal_name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-fg-muted">
          <span>
            <span className="text-fg-subtle">nit:</span> {data.agency.nit}
          </span>
          <span>
            <span className="text-fg-subtle">email:</span> {data.agency.primary_contact_email}
          </span>
          {data.agency.primary_contact_phone && (
            <span>
              <span className="text-fg-subtle">tel:</span> {data.agency.primary_contact_phone}
            </span>
          )}
          <Pill tone="neutral">{data.agency.billing_model}</Pill>
        </div>
      </div>

      {/* 8-metric counters list */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          métricas
        </div>
        <div className="card divide-y divide-bg-border">
          {data.counters.map((c) => (
            <Field key={c.label} label={c.label}>
              {MONEY_COUNTERS.has(c.label)
                ? fmtCOP(Number(c.value))
                : c.value}
            </Field>
          ))}
        </div>
      </section>

      {/* Recent calls + events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            últimas llamadas
          </div>
          <DataTable
            columns={callColumns}
            rows={data.recentCalls}
            getKey={(r) => r.id}
            emptyTitle="Sin llamadas"
          />
        </section>

        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            eventos compliance recientes
          </div>
          <DataTable
            columns={eventColumns}
            rows={data.recentEvents}
            getKey={(r) => r.id}
            emptyTitle="Sin eventos"
          />
        </section>
      </div>
    </div>
  )
}
