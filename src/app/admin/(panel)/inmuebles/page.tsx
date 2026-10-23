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
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'

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
/** El cero de una columna, callado («—» atenuado), con su texto para el lector de pantalla. */
function Cero({ titulo }: { titulo: string }) {
  return (
    <span className="text-fg-subtle" title={titulo}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{titulo}</span>
    </span>
  )
}

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
    // Ronda 26 (revisora r25): el consecutivo de Leasefy y el código de la inmobiliaria ya no son columnas
    // (iguales en todas las filas a la vista); van debajo de la dirección, en mono, y al Excel.
    {
      header: 'Dirección',
      className: 'min-w-[240px]',
      texto: (r) => r.address,
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-body-sm font-medium leading-snug text-fg">{r.address}</div>
          <div className="text-caption text-fg-muted">
            {r.city}
            <span className="font-mono tabular-nums text-fg-subtle">
              {' · '}#{r.code}
              {r.externalId ? ` · N.º ${r.externalId}` : ''}
            </span>
          </div>
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
      cell: (r) =>
        r.contratos > 0 ? (
          <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg">
            {r.contratos}
            {r.activos > 0 ? <span className="text-fg-subtle"> · {r.activos} {r.activos === 1 ? 'vigente' : 'vigentes'}</span> : null}
          </span>
        ) : (
          <Cero titulo="Sin contratos" />
        ),
    },
    {
      header: 'Reparaciones',
      align: 'right',
      texto: (r) => r.reparaciones,
      // A 390 la tarjeta se acorta (antes ~300 px con cinco campos): las reparaciones se ven en su historia.
      enCelular: false,
      cell: (r) =>
        r.reparaciones > 0 ? (
          <span className="font-mono text-caption tabular-nums text-warning">{r.reparaciones}</span>
        ) : (
          <Cero titulo="Sin reparaciones" />
        ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Inmuebles"
        description="Cuántas veces se arrendó cada inmueble, cuánto estuvo desocupado y qué se le reparó."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="La historia de los inmuebles" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Aquí están los inmuebles de todas las inmobiliarias. Al abrir uno se ve su historia: cada contrato,
                cuánto estuvo desocupado entre uno y otro y qué se le reparó.
              </p>
              <p>Es interno de Leasefy: la inmobiliaria no ve esta pantalla.</p>
              <p>Se busca por la dirección, el consecutivo de Leasefy (#) o el código que le puso la inmobiliaria.</p>
            </div>
          </ParaEntenderMas>
        }
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
        cifraDelCelular="Contratos"
        masEnElExcel={[
          { header: '# Leasefy', texto: (r) => r.code },
          { header: 'N.º en la inmobiliaria', texto: (r) => r.externalId },
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
                placeholder="Dirección o código"
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
