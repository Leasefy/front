'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listarInmuebles, ESTADO_DE_INMUEBLE, type InmuebleAdminRow } from '@/lib/admin/inmuebles'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import type { Paginated, PillTone } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { Pill } from '@/components/admin/Pill'

const TONO_DEL_ESTADO: Record<InmuebleAdminRow['status'], PillTone> = {
  RENTED: 'ok',
  AVAILABLE: 'info',
  RESERVED: 'warn',
  PENDING: 'warn',
  DRAFT: 'muted',
}

/**
 * /admin/inmuebles — inmuebles de todas las inmobiliarias, para abrir el
 * historial interno de riesgo de cada uno (Nico, 2026-09-12). 🔴 Vive sólo en
 * el backoffice: la inmobiliaria no ve nada de esto.
 *
 * Filtros en la URL (`q`, `agencyId`, `page`) como toda tabla del admin.
 * Paginado del SERVIDOR: el endpoint devuelve `Paginated<T>` de a 50.
 */
export default function InmueblesPage() {
  const router = useRouter()
  const { get, page, setFilters, setPage } = useUrlFilters()
  const q = get('q')
  const agencyId = get('agencyId')
  const [busqueda, setBusqueda] = useState(q)

  // La URL manda: si alguien llega con `?q=` desde un enlace, el input lo muestra.
  useEffect(() => {
    setBusqueda(q)
  }, [q])

  const { data, isLoading, error } = useApiQuery<Paginated<InmuebleAdminRow>>(
    (signal) => listarInmuebles({ q, agencyId, page }, signal),
    [q, agencyId, page],
  )

  const agenciaFiltrada = agencyId
    ? data?.data.find((r) => r.agencia?.id === agencyId)?.agencia?.name
    : undefined

  const columns: Column<InmuebleAdminRow>[] = [
    {
      header: '# Leasefy',
      cell: (r) => <span className="font-mono text-xs tabular-nums text-fg">{r.code}</span>,
    },
    {
      header: '# inmobiliaria',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums text-fg-muted">{r.externalId ?? '—'}</span>
      ),
    },
    {
      header: 'Dirección',
      cell: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-fg leading-snug">{r.address}</div>
          <div className="text-xs text-fg-muted">{r.city}</div>
        </div>
      ),
    },
    {
      header: 'Inmobiliaria',
      cell: (r) =>
        r.agencia ? (
          <button
            type="button"
            className="text-xs text-fg-muted hover:text-brand transition-colors text-left"
            title="Ver sólo esta inmobiliaria"
            onClick={(e) => {
              e.stopPropagation()
              setFilters({ agencyId: r.agencia?.id }, { resetPage: true })
            }}
          >
            {r.agencia.name}
          </button>
        ) : (
          <span className="text-xs text-fg-subtle">(sin inmobiliaria)</span>
        ),
    },
    {
      header: 'Estado',
      cell: (r) => <Pill tone={TONO_DEL_ESTADO[r.status]}>{ESTADO_DE_INMUEBLE[r.status]}</Pill>,
    },
    {
      header: 'Contratos',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums text-fg">
          {r.contratos}
          <span className="text-fg-subtle"> · {r.activos} act.</span>
        </span>
      ),
    },
    {
      header: 'Reparaciones',
      align: 'right',
      cell: (r) => (
        <span
          className={`font-mono text-xs tabular-nums ${r.reparaciones > 0 ? 'text-warn' : 'text-fg-subtle'}`}
        >
          {r.reparaciones}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="inmuebles · historial interno"
        title="Riesgo por inmueble"
        description="Cuántas veces se arrendó, cuánto estuvo desocupado y qué se le reparó. Interno de Leasefy: la inmobiliaria no ve esta pantalla."
      />

      <form
        className="flex flex-wrap items-center gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          setFilters({ q: busqueda.trim() || undefined }, { resetPage: true })
        }}
      >
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Consecutivo, código de la inmobiliaria o dirección"
          aria-label="Buscar inmueble"
          className="input w-full sm:w-96"
        />
        <button type="submit" className="btn btn-primary">
          Buscar
        </button>
        {q && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setFilters({ q: undefined }, { resetPage: true })}
          >
            Limpiar
          </button>
        )}
        {agencyId && (
          <button
            type="button"
            className="pill pill-info"
            title="Quitar el filtro de inmobiliaria"
            onClick={() => setFilters({ agencyId: undefined }, { resetPage: true })}
          >
            sólo {agenciaFiltrada ?? 'esta inmobiliaria'} ×
          </button>
        )}
      </form>

      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        {data ? `${data.total.toLocaleString('es-CO')} inmuebles · más contratos primero` : 'inmuebles'}
      </div>

      <DataTable
        columns={columns}
        rows={data?.data}
        getKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/inmuebles/${r.id}`)}
        isLoading={isLoading}
        error={error}
        emptyTitle="Sin inmuebles"
        emptyHint={q ? `Nada coincide con «${q}».` : 'Todavía no hay inmuebles cargados.'}
      />

      {data && (
        <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
      )}
    </div>
  )
}
