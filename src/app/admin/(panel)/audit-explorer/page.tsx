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
import { BarraDeFiltros, Buscador, Filtro, FiltroDeFechas } from '@/components/admin/screen/Filtros'
import { Input } from '@/components/ui/input'
import { accionDelAdmin, quienLoHizo, sobreQue } from '@/lib/admin/textos-del-admin'
import { CajonDelDetalle } from '@/components/admin/screen/CajonDelDetalle'

// El back fija 100 por página (`audit-log.service.ts`); 25 pide que acepte `pageSize` (para Víctor).
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

/** El correo de quien lo hizo (sólo si es un correo: un id de cuenta no se muestra; va al Excel). */
function correoDe(actorId: string | null | undefined): string | null {
  return actorId && actorId.includes('@') ? actorId : null
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
      texto: (r) => correoDe(r.actor_id) ?? quienLoHizo(r.actor_type),
      cell: (r) => (
        <div className="min-w-0 text-caption">
          <div className="text-fg">{quienLoHizo(r.actor_type)}</div>
          {correoDe(r.actor_id) ? <div className="truncate text-fg-muted">{correoDe(r.actor_id)}</div> : null}
        </div>
      ),
    },
    {
      header: 'Acción',
      texto: (r) => accionDelAdmin(r.action),
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-body-sm text-fg">{accionDelAdmin(r.action)}</div>
        </div>
      ),
    },
    {
      header: 'Sobre qué',
      texto: (r) => (r.entity_type ? sobreQue(r.entity_type) : ''),
      cell: (r) => (
        <span className="text-caption text-fg-muted">{r.entity_type ? sobreQue(r.entity_type) : '—'}</span>
      ),
    },
    {
      header: 'Inmobiliaria',
      texto: (r) => r.legal_name,
      cell: (r) => <span className="block max-w-[160px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Buscar en auditoría"
        description="La bitácora completa, que nunca se borra, para la SIC y SAGRILAFT."
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
          { header: 'Quién (código)', texto: (r) => [r.actor_type, r.actor_id].filter(Boolean).join(' · ') },
          { header: 'Sobre qué (código)', texto: (r) => r.entity_type ?? '' },
          { header: 'Datos', texto: (r) => (r.payload ? JSON.stringify(r.payload) : '') },
          { header: 'Id de lo afectado', texto: (r) => r.entity_id ?? '' },
          { header: 'Id', texto: (r) => r.id },
        ]}
        // Ronda 28 (revisora r27, T13): el buscador SIEMPRE a la vista a 390 (antes detrás de «Filtros»);
        // sólo los desplegables se pliegan.
        buscadorPropio={
          <Buscador
            id="filtro-accion"
            value={action}
            onChange={(v) => setFilters({ action: v }, { resetPage: true })}
            placeholder="Buscar una acción"
            aria-label="Acción (contiene)"
          />
        }
        barra={
          <BarraDeFiltros>
            {/* El rótulo de cada texto va ADENTRO, como en los desplegables (21-10). */}
            <Filtro etiqueta="Cédula del deudor" htmlFor="filtro-cedula" className="sm:w-48">
              <Input
                id="filtro-cedula"
                className="font-mono"
                inputMode="numeric"
                data-etiqueta-adentro=""
                value={debtorDoc}
                onChange={(e) => setFilters({ debtorDoc: e.target.value }, { resetPage: true })}
                placeholder="Cédula del deudor"
              />
            </Filtro>
            <Filtro etiqueta="Número del registro afectado" htmlFor="filtro-entidad" className="sm:w-56">
              <Input
                id="filtro-entidad"
                className="font-mono"
                data-etiqueta-adentro=""
                value={entityId}
                onChange={(e) => setFilters({ entityId: e.target.value }, { resetPage: true })}
                placeholder="Número del registro afectado"
              />
            </Filtro>
            <FiltroDeFechas
              desde={from}
              hasta={to}
              onDesde={(v) => setFilters({ from: v }, { resetPage: true })}
              onHasta={(v) => setFilters({ to: v }, { resetPage: true })}
            />
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
                { nombre: 'Quién', valor: correoDe(abierta.actor_id) ?? quienLoHizo(abierta.actor_type) },
                { nombre: 'Tipo', valor: quienLoHizo(abierta.actor_type) },
                { nombre: 'Código', valor: <code className="font-mono">{abierta.action}</code> },
                { nombre: 'Sobre qué', valor: abierta.entity_type ? sobreQue(abierta.entity_type) : '—' },
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
