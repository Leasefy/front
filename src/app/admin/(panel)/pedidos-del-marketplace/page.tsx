'use client'

/**
 * Los pedidos que la gente deja en el perfil de las inmobiliarias del marketplace (Nico, 29-10-2026: «y también nos
 * debe llegar a nosotros en el admin»). Back: `GET /api/v1/admin/pedidos-del-marketplace` (los últimos 200; cada lectura
 * queda en la bitácora del admin porque trae celular y correo).
 */

import { MagnifyingGlass } from '@phosphor-icons/react'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'

interface PedidoDelMarketplace {
  id: string
  agencyId: string
  inmobiliaria: string | null
  nombre: string
  correo: string | null
  celular: string | null
  pedido: string
  etapa: string
  creadoAt: string
}

const dia = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

const COLUMNAS: Column<PedidoDelMarketplace>[] = [
  { header: 'Cuándo', texto: (r) => r.creadoAt, orden: (r) => r.creadoAt, cell: (r) => <span className="font-mono text-caption tabular-nums text-fg-muted">{dia(r.creadoAt)}</span> },
  { header: 'Inmobiliaria', texto: (r) => r.inmobiliaria ?? '', orden: (r) => r.inmobiliaria ?? '', cell: (r) => <span className="text-body-sm text-fg">{r.inmobiliaria ?? '—'}</span> },
  {
    header: 'Quién',
    texto: (r) => `${r.nombre} ${r.celular ?? ''} ${r.correo ?? ''}`,
    orden: (r) => r.nombre,
    cell: (r) => (
      <div className="min-w-0">
        <div className="text-body-sm text-fg">{r.nombre}</div>
        <div className="text-caption text-fg-muted">{[r.celular, r.correo].filter(Boolean).join(' · ')}</div>
      </div>
    ),
  },
  { header: 'Qué pidió', className: 'min-w-[280px]', texto: (r) => r.pedido, cell: (r) => <span className="text-body-sm text-fg">{r.pedido}</span> },
]

export default function PedidosDelMarketplacePage() {
  const { data, isLoading, error, refetch } = useApiQuery<PedidoDelMarketplace[]>(
    (signal) => adminApi<PedidoDelMarketplace[]>('/pedidos-del-marketplace', { signal }),
    [],
  )
  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos del marketplace" description="Lo que la gente le pide a cada inmobiliaria desde su perfil, con o sin cuenta." />
      <DataTable
        columns={COLUMNAS}
        rows={data}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="Todavía no han dejado pedidos"
        emptyIcon={<MagnifyingGlass weight="bold" />}
        aria-label="Pedidos del marketplace"
        queSon={['pedido', 'pedidos']}
      />
    </div>
  )
}
