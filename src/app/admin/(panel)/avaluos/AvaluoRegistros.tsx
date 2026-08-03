'use client'

import { useRouter } from 'next/navigation'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fetchAvaluoList, type AvaluoListResponse } from '@/lib/admin/avaluos'
import { AvaluoRegistrosView } from './AvaluoRegistrosView'

/**
 * "Registros por estado" — the full certificate history, filterable by lifecycle
 * state. Container: reads the `estado`/`page` URL filters, fetches the general
 * list (front `fetchAvaluoList` → back `GET /api/v1/admin/avaluos?state=&page=`
 * → micro `GET /api/avaluo/list/all`), and hands everything to the pure view.
 *
 * Unlike the "por firmar" queue (only `en_revisión`), this lists EVERY state —
 * borradores, firmados, rechazados y entregados. `estado === ''` ("Todos") calls
 * the list without a `state`, so the back/micro return every certificate.
 */
export function AvaluoRegistros() {
  const router = useRouter()
  const { get, page, setFilters, setPage } = useUrlFilters()
  const estado = get('estado')

  const { data, isLoading, error } = useApiQuery<AvaluoListResponse>(
    (signal) => fetchAvaluoList({ state: estado || undefined, page }, signal),
    [estado, page],
  )

  return (
    <AvaluoRegistrosView
      activeState={estado}
      onStateChange={(state) => setFilters({ estado: state || undefined }, { resetPage: true })}
      page={page}
      onPage={setPage}
      items={data?.items}
      total={data?.total}
      pageSize={data?.pageSize ?? 100}
      isLoading={isLoading}
      error={error}
      onRowClick={(id) => router.push(`/admin/avaluos/${id}`)}
    />
  )
}
