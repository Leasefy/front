'use client'

import { BellSlash, HandPalm, Scales, Users } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { Pill } from '@/components/admin/Pill'
import { BarraDeFiltros, Buscador, Filtro } from '@/components/admin/screen/Filtros'
import { legible } from '@/lib/admin/textos-del-admin'

const PAGE_SIZE = 50

// ── Types ──────────────────────────────────────────────────────────────────

interface OptOutStats {
  total: string
  opt_out_invoked: string
  opt_out_request: string
  habeas_data_opt_out: string
}

// Contact PII (document/phone) is deliberately omitted by the back on this
// resource — only names are exposed (ADMIN-API-CONTRACT.md — Opt-outs).
interface OptOutRow {
  id: string
  event_type: string
  timestamp: string
  tenant_id: string
  legal_name: string | null
  debtor_id: string
  debtor_name: string | null
  channel: string | null
  detection: string | null
  matched_phrase: string | null
  call_id: string | null
  opt_out_channels: string[] | null
}

interface OptOutsResponse extends Paginated<OptOutRow> {
  stats: OptOutStats
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /opt-outs — Habeas Data registry (Ley 1581 + Ley 2300). Read-only. (FRONT.md §6.18 · BACK.md §8.16). */
export default function OptOutsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const q = get('q')

  const result = useApiQuery<OptOutsResponse>(
    (signal) => adminApi('/opt-outs', { query: { q, page }, signal }),
    [q, page],
  )

  const stats = result.data?.stats

  const columns: Column<OptOutRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.timestamp)}</span>,
    },
    { header: 'Deudor', cell: (r) => <span className="block max-w-[200px] truncate font-medium text-fg">{r.debtor_name ?? '—'}</span> },
    { header: 'Inmobiliaria', cell: (r) => <span className="block max-w-[160px] truncate text-fg-muted">{r.legal_name ?? '—'}</span> },
    { header: 'Canal', cell: (r) => <Pill tone="bad">{legible(r.channel ?? 'voice')}</Pill> },
    { header: 'Cómo se detectó', cell: (r) => <span className="text-fg-muted">{r.detection ? legible(r.detection) : '—'}</span> },
    {
      header: 'Lo que dijo',
      cell: (r) => (
        <span className="block max-w-[240px] truncate italic text-fg-muted">{r.matched_phrase ? `«${r.matched_phrase}»` : '—'}</span>
      ),
    },
    {
      header: 'Canales cerrados',
      cell: (r) => {
        const channels = r.opt_out_channels ?? []
        if (channels.length === 0) return <span className="text-fg-subtle">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {channels.map((c) => (
              <Pill key={c} tone="bad">
                {legible(c)}
              </Pill>
            ))}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Bajas de contacto"
        description="Habeas Data (Ley 1581) y Ley 2300: los deudores que pidieron no ser contactados. Es un registro que no se revoca; sólo lectura."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users />} label="Bajas en total" value={result.isLoading ? '—' : Number(stats?.total ?? 0)} hint="Desde que existe Leasefy" />
        <KpiCard icon={<HandPalm />} tone="bad" label="Lo pidió en la llamada" value={result.isLoading ? '—' : Number(stats?.opt_out_invoked ?? 0)} />
        <KpiCard icon={<BellSlash />} tone="warn" label="Solicitudes" value={result.isLoading ? '—' : Number(stats?.opt_out_request ?? 0)} />
        <KpiCard icon={<Scales />} label="Habeas Data" value={result.isLoading ? '—' : Number(stats?.habeas_data_opt_out ?? 0)} />
      </div>

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.id}
        isLoading={result.isLoading}
        error={result.error}
        onReintentar={result.refetch}
        emptyTitle={q ? 'Nadie con ese nombre pidió la baja' : 'Nadie ha pedido la baja todavía'}
        emptyIcon={<BellSlash weight="bold" />}
        aria-label="Bajas de contacto"
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Deudor" htmlFor="filtro-deudor" className="sm:min-w-72 sm:flex-1">
              <Buscador
                id="filtro-deudor"
                value={q}
                onChange={(v) => setFilters({ q: v }, { resetPage: true })}
                placeholder="Buscar por nombre…"
              />
            </Filtro>
          </BarraDeFiltros>
        }
        pie={result.data ? <Pagination page={page} total={result.data.total} pageSize={PAGE_SIZE} onPage={setPage} /> : null}
      />

      <Alert variant="danger" role="note" title="Base legal">
        Ley 1581 de 2012 y Ley 2300 de 2023 (art. 7). La baja <strong>no se revoca</strong> sin un consentimiento
        explícito y posterior del titular: para revertirla hace falta su autorización por escrito y el visto bueno del
        equipo legal de Leasefy. No se borra nada de acá sin dejar rastro.
      </Alert>
    </div>
  )
}
