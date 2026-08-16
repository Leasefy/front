'use client'

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { useClientPagination } from '@/lib/admin/use-client-pagination'
import { Pill } from '@/components/admin/Pill'

const PAGE_SIZE = 50

// ---------- Types ----------

interface TenantRow {
  agency_id: string
  tenant_id: string
  legal_name: string
  nit: string
  billing_model: string
  primary_contact_email: string
  created_at: string
  debtor_count: number
  call_count: number
  paid_total: string | null
}

// ---------- Page ----------

/**
 * /tenants — agency roster (BACK.md §8.3 · FRONT.md §6.4).
 *
 * El endpoint devuelve un arreglo pelado (sin `page`/`limit`, sin `total`), así
 * que el recorte va en el cliente: el roster crece con cada agencia y sin pie de
 * paginación la pantalla era un volcado. Cuando `/tenants` exponga contrato
 * `Paginated<T>`, esto pasa a ser paginado de servidor como `/payments`.
 */
export default function TenantsPage() {
  const router = useRouter()

  const tenants = useApiQuery<TenantRow[]>(
    (signal) => adminApi('/tenants', { signal }),
  )

  const { page, setPage, total, pageRows } = useClientPagination(tenants.data, PAGE_SIZE)

  const columns: Column<TenantRow>[] = [
    {
      header: 'Razón social',
      cell: (r) => <span className="font-medium text-fg">{r.legal_name}</span>,
    },
    {
      header: 'NIT',
      cell: (r) => (
        <span className="font-mono text-xs text-fg-muted tabular-nums">{r.nit}</span>
      ),
    },
    {
      header: 'Contacto',
      cell: (r) => <span className="text-xs text-fg-muted">{r.primary_contact_email}</span>,
    },
    {
      header: 'Modelo',
      cell: (r) => <Pill tone="neutral">{r.billing_model}</Pill>,
    },
    {
      header: 'Deudores',
      align: 'right',
      cell: (r) => <span className="tabular-nums font-mono text-sm">{r.debtor_count}</span>,
    },
    {
      header: 'Llamadas',
      align: 'right',
      cell: (r) => <span className="tabular-nums font-mono text-sm">{r.call_count}</span>,
    },
    {
      header: 'Pagado aprobado',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums text-fg-muted text-sm">
          {r.paid_total != null ? fmtCOP(parseFloat(r.paid_total)) : '—'}
        </span>
      ),
    },
    {
      header: 'Alta',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-fg-muted tabular-nums">
          {fmtDateTime(r.created_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="02 · tenants"
        title="Inmobiliarias"
        description="Todas las agencias registradas en la plataforma. Click en una fila para ver el detalle."
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getKey={(r) => r.agency_id}
        isLoading={tenants.isLoading}
        error={tenants.error}
        emptyTitle="Sin agencias"
        emptyHint="No hay agencias registradas en la base."
        onRowClick={(r) => router.push(`/admin/tenants/${r.tenant_id}`)}
      />

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  )
}
