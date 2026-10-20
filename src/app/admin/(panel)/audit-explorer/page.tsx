'use client'

import { Binoculars, X } from '@phosphor-icons/react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { BarraDeFiltros, Buscador, Filtro } from '@/components/admin/screen/Filtros'
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { legible } from '@/lib/admin/textos-del-admin'

const PAGE_SIZE = 100

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string
  created_at: string
  actor_type: string
  action: string
  entity_type: string | null
  entity_id: string | null
  payload: Record<string, unknown> | null
  tenant_id: string | null
  legal_name: string | null
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /audit-explorer — audit_log search for SIC / SAGRILAFT audits (FRONT.md §6.24 · BACK.md §8.14). */
export default function AuditExplorerPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const action    = get('action')
  const debtorDoc = get('debtorDoc')
  const entityId  = get('entityId')
  const from      = get('from')
  const to        = get('to')

  const result = useApiQuery<Paginated<AuditLogRow>>(
    (signal) =>
      adminApi('/audit-log', {
        query: { action, debtorDoc, entityId, from, to, page },
        signal,
      }),
    [action, debtorDoc, entityId, from, to, page],
  )

  const hasFilters = action || debtorDoc || entityId || from || to

  const columns: Column<AuditLogRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.created_at)}</span>
      ),
    },
    {
      header: 'Quién',
      cell: (r) => <span className="text-fg-muted">{legible(r.actor_type)}</span>,
    },
    {
      header: 'Acción',
      cell: (r) => <span className="font-mono text-caption text-fg">{r.action}</span>,
    },
    {
      header: 'Sobre qué',
      cell: (r) => (
        <div className="font-mono text-caption text-fg-subtle">
          <div>{r.entity_type ? legible(r.entity_type) : '—'}</div>
          <div>{r.entity_id ? `${r.entity_id.slice(0, 8)}…` : '—'}</div>
        </div>
      ),
    },
    {
      header: 'Inmobiliaria',
      cell: (r) => <span className="block max-w-[160px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Datos',
      cell: (r) => {
        const full = r.payload ? JSON.stringify(r.payload) : null
        return (
          <span className="block max-w-[280px] truncate font-mono text-caption text-fg-muted" title={full ?? undefined}>
            {full ? full.slice(0, 100) : '—'}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Buscar en auditoría"
        description="La bitácora completa (audit_log), que nunca se borra, para las auditorías de la SIC y SAGRILAFT."
      />

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.id}
        isLoading={result.isLoading}
        error={result.error}
        onReintentar={result.refetch}
        emptyTitle="No encontramos nada con estos filtros"
        emptyHint="Prueba con otra acción, otra cédula u otras fechas."
        emptyIcon={<Binoculars weight="bold" />}
        aria-label="Bitácora de auditoría"
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Acción (contiene)" htmlFor="filtro-accion" className="sm:min-w-56 sm:flex-1">
              <Buscador
                id="filtro-accion"
                value={action}
                onChange={(v) => setFilters({ action: v }, { resetPage: true })}
                placeholder="p. ej. payment.recovered"
              />
            </Filtro>
            <Filtro etiqueta="Cédula del deudor" htmlFor="filtro-cedula" className="sm:w-44">
              <Input
                id="filtro-cedula"
                className="font-mono"
                inputMode="numeric"
                value={debtorDoc}
                onChange={(e) => setFilters({ debtorDoc: e.target.value }, { resetPage: true })}
                placeholder="1234567"
              />
            </Filtro>
            <Filtro etiqueta="Id de la entidad" htmlFor="filtro-entidad" className="sm:w-56">
              <Input
                id="filtro-entidad"
                className="font-mono"
                value={entityId}
                onChange={(e) => setFilters({ entityId: e.target.value }, { resetPage: true })}
                placeholder="UUID"
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
                onClick={() =>
                  setFilters({ action: '', debtorDoc: '', entityId: '', from: '', to: '' }, { resetPage: true })
                }
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Quitar los filtros
              </Button>
            ) : null}
          </BarraDeFiltros>
        }
        pie={result.data ? <Pagination page={page} total={result.data.total} pageSize={PAGE_SIZE} onPage={setPage} /> : null}
      />
    </div>
  )
}
