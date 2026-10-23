'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { House } from '@phosphor-icons/react'
import { listarInmuebles, ESTADO_DE_INMUEBLE, type InmuebleAdminRow } from '@/lib/admin/inmuebles'
import { traerTodasLasPaginas } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import type { Paginated, PillTone } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { BarraDeFiltros, Buscador, Filtro, SelectorDeInmobiliaria } from '@/components/admin/screen/Filtros'
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

  // La URL manda: si alguien llega con `?q=` desde un enlace, el campo lo muestra.
  useEffect(() => {
    setBusqueda(q)
  }, [q])

  // La búsqueda viaja al back: se manda al dejar de escribir (no con cada tecla).
  useEffect(() => {
    if (busqueda.trim() === q) return
    const t = setTimeout(() => setFilters({ q: busqueda.trim() || undefined, page: undefined }), 400)
    return () => clearTimeout(t)
  }, [busqueda, q, setFilters])

  const { data, isLoading, error, refetch } = useApiQuery<Paginated<InmuebleAdminRow>>(
    (signal) => listarInmuebles({ q, agencyId, page }, signal),
    [q, agencyId, page],
  )

  const columns: Column<InmuebleAdminRow>[] = [
    {
      header: '# Leasefy',
      texto: (r) => r.code,
      cell: (r) => <span className="font-mono text-caption tabular-nums text-fg">{r.code}</span>,
    },
    {
      header: 'N.º en la inmobiliaria',
      texto: (r) => r.externalId,
      cell: (r) => <span className="font-mono text-caption tabular-nums text-fg-muted">{r.externalId ?? '—'}</span>,
    },
    {
      header: 'Dirección',
      className: 'min-w-[220px]',
      texto: (r) => r.address,
      cell: (r) => (
        <div className="min-w-0">
          <div className="font-medium leading-snug text-fg">{r.address}</div>
          <div className="text-caption text-fg-muted">{r.city}</div>
        </div>
      ),
    },
    {
      header: 'Inmobiliaria',
      texto: (r) => r.agencia?.name ?? '',
      cell: (r) =>
        r.agencia ? (
          // allowlist: atajo de filtro dentro de la celda — tocar el nombre acota la lista sin abrir la fila.
          <button
            type="button"
            className="rounded-sm text-left text-body-sm text-fg-muted underline-offset-4 outline-none transition-colors hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            title="Ver sólo esta inmobiliaria"
            onClick={(e) => {
              e.stopPropagation()
              setFilters({ agencyId: r.agencia?.id, page: undefined })
            }}
          >
            {r.agencia.name}
          </button>
        ) : (
          <span className="text-caption text-fg-subtle">(sin inmobiliaria)</span>
        ),
    },
    {
      header: 'Estado',
      texto: (r) => ESTADO_DE_INMUEBLE[r.status],
      cell: (r) => <Pill tone={TONO_DEL_ESTADO[r.status]}>{ESTADO_DE_INMUEBLE[r.status]}</Pill>,
    },
    {
      header: 'Contratos',
      align: 'right',
      texto: (r) => r.contratos,
      cell: (r) => (
        <span className="font-mono text-caption tabular-nums text-fg">
          {r.contratos}
          <span className="text-fg-subtle"> · {r.activos} vigentes</span>
        </span>
      ),
    },
    {
      header: 'Reparaciones',
      align: 'right',
      texto: (r) => r.reparaciones,
      cell: (r) => (
        <span className={`font-mono text-caption tabular-nums ${r.reparaciones > 0 ? 'text-warning' : 'text-fg-subtle'}`}>
          {r.reparaciones}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Inmuebles"
        description="Cuántas veces se arrendó cada inmueble, cuánto estuvo desocupado y qué se le reparó. Toca uno para ver su historia."
        junto={<Pill tone="neutral">Interno de Leasefy</Pill>}
      />

      <DataTable
        columns={columns}
        rows={data?.data}
        getKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/inmuebles/${r.id}`)}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="Todavía no hay inmuebles cargados"
        emptyIcon={<House weight="bold" />}
        aria-label="Inmuebles"
        paginacion={data ? { page, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
        queSon={['inmueble', 'inmuebles']}
        filtrosEnLaUrl={['q', 'agencyId']}
        onLimpiarFiltros={() => setBusqueda('')}
        exportar="inmuebles"
        traerTodoParaElExcel={() => traerTodasLasPaginas<InmuebleAdminRow>('/inmuebles', { q: q || undefined, agencyId: agencyId || undefined })}
        masEnElExcel={[
          { header: 'Ciudad', texto: (r) => r.city },
          { header: 'Contratos vigentes', texto: (r) => r.activos },
        ]}
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Buscar" htmlFor="buscar-inmueble" className="sm:min-w-72 sm:flex-1">
              <Buscador
                id="buscar-inmueble"
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Consecutivo, código de la inmobiliaria o dirección"
              />
            </Filtro>
            <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria">
              <SelectorDeInmobiliaria
                id="filtro-inmobiliaria"
                value={agencyId}
                onChange={(v) => setFilters({ agencyId: v, page: undefined })}
              />
            </Filtro>
          </BarraDeFiltros>
        }
      />
      <p className="text-caption text-fg-subtle">Primero los que más contratos han tenido.</p>
    </div>
  )
}
