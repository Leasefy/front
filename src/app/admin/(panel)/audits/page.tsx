'use client'

import { useState } from 'react'
import { DownloadSimple, ShieldCheck, X } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { adminApi, adminApiUrl } from '@/lib/admin/api'
import { getSupabase } from '@/lib/supabase/client'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { legible } from '@/lib/admin/textos-del-admin'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 100

// ── Types ──────────────────────────────────────────────────────────────────

interface EventRow {
  id: string
  event_type: string
  timestamp: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
  channel: string | null
  details: Record<string, unknown> | null
  evidence_url: string | null
}

interface AuditFacets {
  eventTypes: string[]
  tenants: Array<{ tenant_id: string; legal_name: string | null }>
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /audits — Compliance events table with facet selects + CSV export (FRONT.md §6.8 · BACK.md §8.13). */
export default function AuditsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const type   = get('type')
  const tenant = get('tenant')
  const from   = get('from')
  const to     = get('to')

  const events = useApiQuery<Paginated<EventRow>>(
    (signal) => adminApi('/audits', { query: { type, tenant, from, to, page }, signal }),
    [type, tenant, from, to, page],
  )

  const facets = useApiQuery<AuditFacets>(
    (signal) => adminApi('/audits/facets', { signal }),
    [],
  )

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // The export endpoint only accepts Bearer auth in the Authorization header,
  // so a plain <a href> can never authenticate — download via fetch + Blob.
  async function onExport() {
    setExporting(true)
    setExportError(null)
    try {
      const sb = getSupabase()
      const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null
      if (!token) throw new Error('Tu sesión venció: vuelve a entrar.')
      const exportUrl = adminApiUrl('/audits/export.csv', {
        type:   type   || undefined,
        tenant: tenant || undefined,
        from:   from   || undefined,
        to:     to     || undefined,
      })
      const res = await fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Error ${res.status} al exportar`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(mensajeDelAdmin(err, { accion: 'exportar la auditoría' }))
    } finally {
      setExporting(false)
    }
  }

  const hasFilters = type || tenant || from || to

  const columns: Column<EventRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.timestamp)}</span>
      ),
    },
    {
      header: 'Evento',
      cell: (r) => (
        <span className="text-fg" title={r.event_type}>
          {legible(r.event_type)}
        </span>
      ),
    },
    {
      header: 'Inmobiliaria',
      cell: (r) => <span className="block max-w-[180px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Deudor',
      cell: (r) => <span className="block max-w-[180px] truncate">{r.debtor_name ?? '—'}</span>,
    },
    {
      header: 'Canal',
      cell: (r) => <span className="text-fg-muted">{r.channel ? legible(r.channel) : '—'}</span>,
    },
    {
      header: 'Detalles',
      cell: (r) => {
        const full = r.details ? JSON.stringify(r.details) : null
        return (
          <span className="block max-w-[420px] truncate font-mono text-caption text-fg-muted" title={full ?? undefined}>
            {full ? full.slice(0, 120) : '—'}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Auditoría"
        description="Los eventos de cumplimiento: Habeas Data, Ley 2300, identidad y barandas de los agentes. Se descargan en CSV (hasta 50.000 filas)."
        right={
          <Button variant="outline" hideArrow onClick={onExport} disabled={exporting} isLoading={exporting}>
            <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            {exporting ? 'Descargando…' : 'Descargar CSV'}
          </Button>
        }
      />

      {exportError && <Alert variant="danger">{exportError}</Alert>}

      <DataTable
        columns={columns}
        rows={events.data?.data}
        getKey={(r) => r.id}
        isLoading={events.isLoading}
        error={events.error}
        onReintentar={events.refetch}
        emptyTitle="No hay eventos con estos filtros"
        emptyHint="Prueba con otro tipo, otra inmobiliaria u otras fechas."
        emptyIcon={<ShieldCheck weight="bold" />}
        aria-label="Eventos de cumplimiento"
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Tipo de evento" htmlFor="filtro-tipo">
              <Desplegable
                id="filtro-tipo"
                value={type}
                onChange={(v) => setFilters({ type: v }, { resetPage: true })}
                todas="Todos los eventos"
                opciones={(facets.data?.eventTypes ?? []).map((t) => ({ valor: t, nombre: legible(t) }))}
              />
            </Filtro>
            <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria">
              <Desplegable
                id="filtro-inmobiliaria"
                value={tenant}
                onChange={(v) => setFilters({ tenant: v }, { resetPage: true })}
                todas="Todas las inmobiliarias"
                opciones={(facets.data?.tenants ?? []).map((t) => ({ valor: t.tenant_id, nombre: t.legal_name ?? t.tenant_id }))}
              />
            </Filtro>
            <Filtro etiqueta="Desde" htmlFor="filtro-desde" className="sm:w-44">
              <CampoDeFecha id="filtro-desde" value={from} onChange={(v) => setFilters({ from: v }, { resetPage: true })} />
            </Filtro>
            <Filtro etiqueta="Hasta" htmlFor="filtro-hasta" className="sm:w-44">
              <CampoDeFecha id="filtro-hasta" value={to} onChange={(v) => setFilters({ to: v }, { resetPage: true })} />
            </Filtro>
            {hasFilters ? (
              <Button
                variant="ghost"
                hideArrow
                onClick={() => setFilters({ type: '', tenant: '', from: '', to: '' }, { resetPage: true })}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Quitar los filtros
              </Button>
            ) : null}
          </BarraDeFiltros>
        }
        pie={events.data ? <Pagination page={page} total={events.data.total} pageSize={PAGE_SIZE} onPage={setPage} /> : null}
      />
    </div>
  )
}
