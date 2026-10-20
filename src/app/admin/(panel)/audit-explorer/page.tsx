'use client'

import { useState } from 'react'
import { Binoculars } from '@phosphor-icons/react'
import { adminApi, traerTodasLasPaginas } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { BarraDeFiltros, Buscador, Filtro } from '@/components/admin/screen/Filtros'
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha'
import { Input } from '@/components/ui/input'
import { accionDelAdmin, legible } from '@/lib/admin/textos-del-admin'
import { CajonDelDetalle } from '@/components/admin/screen/CajonDelDetalle'

const PAGE_SIZE = 100

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string
  created_at: string
  actor_type: string
  /** El correo de quien lo hizo cuando fue una persona del equipo. */
  actor_id?: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  payload: Record<string, unknown> | null
  tenant_id: string | null
  legal_name: string | null
}

/** Quién deja el registro. */
const ACTOR: Record<string, string> = {
  admin: 'Equipo de Leasefy',
  agent: 'Un agente',
  system: 'El sistema',
  user: 'Una persona de la inmobiliaria',
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /audit-explorer — audit_log search for SIC / SAGRILAFT audits (FRONT.md §6.24 · BACK.md §8.14). */
export default function AuditExplorerPage() {
  const [abierta, setAbierta] = useState<AuditLogRow | null>(null)
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


  const columns: Column<AuditLogRow>[] = [
    {
      header: 'Cuándo',
      texto: (r) => fmtDateTime(r.created_at),
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.created_at)}</span>
      ),
    },
    {
      header: 'Quién',
      texto: (r) => r.actor_id || ACTOR[r.actor_type] || legible(r.actor_type),
      cell: (r) => (
        <div className="min-w-0 text-caption">
          <div className="text-fg">{ACTOR[r.actor_type] ?? legible(r.actor_type)}</div>
          {r.actor_id ? <div className="truncate text-fg-muted">{r.actor_id}</div> : null}
        </div>
      ),
    },
    {
      header: 'Acción',
      texto: (r) => accionDelAdmin(r.action),
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-body-sm text-fg">{accionDelAdmin(r.action)}</div>
          <code className="font-mono text-caption text-fg-subtle">{r.action}</code>
        </div>
      ),
    },
    {
      header: 'Sobre qué',
      texto: (r) => [r.entity_type ? legible(r.entity_type) : '', r.entity_id ?? ''].filter(Boolean).join(' · '),
      cell: (r) => (
        <div className="font-mono text-caption text-fg-subtle">
          <div>{r.entity_type ? legible(r.entity_type) : '—'}</div>
          <div>{r.entity_id ? `${r.entity_id.slice(0, 8)}…` : '—'}</div>
        </div>
      ),
    },
    {
      header: 'Inmobiliaria',
      texto: (r) => r.legal_name,
      cell: (r) => <span className="block max-w-[160px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Datos',
      texto: (r) => (r.payload ? JSON.stringify(r.payload) : ''),
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
        onRowClick={setAbierta}
        filaMarcada={(r) => r.id === abierta?.id}
        paginacion={result.data ? { page, total: result.data.total, pageSize: PAGE_SIZE, onPage: setPage } : undefined}
        queSon={['registro', 'registros']}
        filtrosEnLaUrl={['action', 'debtorDoc', 'entityId', 'from', 'to']}
        exportar="auditoria-bitacora"
        traerTodoParaElExcel={() =>
          traerTodasLasPaginas<AuditLogRow>('/audit-log', { action, debtorDoc, entityId, from, to })
        }
        masEnElExcel={[
          { header: 'Código de la acción', texto: (r) => r.action },
          { header: 'Id', texto: (r) => r.id },
        ]}
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
          </BarraDeFiltros>
        }
      />

      <CajonDelDetalle
        abierto={abierta !== null}
        onCerrar={() => setAbierta(null)}
        titulo={abierta ? accionDelAdmin(abierta.action) : 'Registro'}
        descripcion={abierta ? fmtDateTime(abierta.created_at) : undefined}
        campos={
          abierta
            ? [
                { nombre: 'Quién', valor: abierta.actor_id || ACTOR[abierta.actor_type] || legible(abierta.actor_type) },
                { nombre: 'Tipo', valor: ACTOR[abierta.actor_type] ?? legible(abierta.actor_type) },
                { nombre: 'Código', valor: <code className="font-mono">{abierta.action}</code> },
                { nombre: 'Sobre qué', valor: abierta.entity_type ? legible(abierta.entity_type) : '—' },
                { nombre: 'Id', valor: abierta.entity_id ? <code className="font-mono">{abierta.entity_id}</code> : '—' },
                { nombre: 'Inmobiliaria', valor: abierta.legal_name ?? '—' },
                { nombre: 'Registro', valor: <code className="font-mono">{abierta.id}</code> },
              ]
            : []
        }
        datos={abierta?.payload}
      />
    </div>
  )
}
