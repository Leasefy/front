'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Wallet } from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import type { Paginated } from '@/lib/admin/types'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { EmptyBlock } from '@/components/admin/screen/states'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/admin/Pill'
import { ETAPA, esEtapaDeCartera, motivoDeEtapa, siguienteContacto } from '@/lib/admin/textos-del-admin'

const PAGE_SIZE = 50

// ---------- Types ----------

interface DebtorInStage {
  debtor_id: string
  full_name: string | null
  document_number: string | null
  phone_primary: string | null
  tenant_id: string
  legal_name: string | null
  stage_entered_at: string
  previous_stage: string | null
  transition_reason: string
  days_in_state: string // numeric as text, e.g. "14.5"
  next_planned_for: string | null
  next_channel: string | null
}

/**
 * Response for GET /cartera/:stage (docs/ADMIN-API-CONTRACT.md):
 * standard Paginated envelope + stage stats + tenants[] for the filter select.
 */
interface CarteraStageResponse extends Paginated<DebtorInStage> {
  stats: {
    n: string
    avg_days_in_state: string | null
    oldest_entered_at: string | null
  }
  tenants: Array<{ tenant_id: string; legal_name: string }>
}

// ---------- Heat color for days-in-state ----------

function daysClass(days: number): string {
  if (days >= 30) return 'text-danger'
  if (days >= 14) return 'text-warning'
  return 'text-fg'
}

// ---------- Page ----------

/** /cartera/:stage — stage detail (BACK.md §8.6 · FRONT.md §6.10). Paginated, oldest-first. */
export default function CarteraStagePage() {
  const params = useParams<{ stage: string }>()
  const rawStage = (params.stage ?? '').toUpperCase()

  const { get, page, setFilters, setPage } = useUrlFilters()
  const tenant = get('tenant')

  const isValid = esEtapaDeCartera(rawStage)
  const stage = isValid ? rawStage : null

  const result = useApiQuery<CarteraStageResponse>(
    (signal) =>
      adminApi(`/cartera/${stage}`, { query: { tenant, page }, signal }),
    [stage, tenant, page],
    isValid,
  )

  // Etapa que no existe — se cuida en el cliente (FRONT.md §6.10)
  if (!isValid) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <BackButton href="/admin/cartera" label="Volver a cartera" />
        <EmptyBlock
          icono={<Wallet weight="duotone" />}
          tono="neutro"
          title="Esa etapa de cobro no existe"
          hint="Puede que el enlace esté mal copiado. Elige la etapa desde la cartera."
          accion={
            <Button asChild size="sm" variant="outline" hideArrow>
              <Link href="/admin/cartera">Ver la cartera</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const etapa = ETAPA[stage!]
  const stageTenants = result.data?.tenants ?? []
  const showFilter = stageTenants.length > 1

  const columns: Column<DebtorInStage>[] = [
    {
      header: 'Deudor',
      cell: (r) => (
        <div className="min-w-0">
          <div className="max-w-[220px] truncate font-medium text-fg">{r.full_name ?? '—'}</div>
          {r.document_number && <MonoLabel className="tabular-nums">CC {r.document_number}</MonoLabel>}
        </div>
      ),
    },
    {
      header: 'Inmobiliaria',
      cell: (r) => <span className="block max-w-[180px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Venía de',
      cell: (r) =>
        r.previous_stage && esEtapaDeCartera(r.previous_stage) ? (
          <Pill tone={ETAPA[r.previous_stage].tono}>{ETAPA[r.previous_stage].nombre}</Pill>
        ) : (
          <span className="text-fg-muted">{r.previous_stage ? (esEtapaDeCartera(r.previous_stage) ? ETAPA[r.previous_stage].nombre : 'Otra etapa') : 'Inicio'}</span>
        ),
    },
    {
      header: 'Días en la etapa',
      align: 'right',
      cell: (r) => {
        const days = parseFloat(r.days_in_state)
        return (
          <span className={`font-mono tabular-nums ${daysClass(days)}`}>
            {days.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
        )
      },
    },
    {
      header: 'Entró',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.stage_entered_at)}</span>
      ),
    },
    {
      header: 'Lo siguiente',
      cell: (r) =>
        r.next_planned_for ? (
          <div>
            <div className="font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.next_planned_for)}</div>
            <div className="text-caption text-fg-subtle">{r.next_channel ? siguienteContacto(r.next_channel) : '—'}</div>
          </div>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Motivo',
      cell: (r) => (
        <span className="block max-w-[240px] truncate text-fg-muted">
          {motivoDeEtapa(r.transition_reason)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/cartera" label="Volver a cartera" />
      <PageHeader
        label="Cartera"
        title={etapa.nombre}
        description={`${etapa.pista.charAt(0).toUpperCase()}${etapa.pista.slice(1)}. Primero los que llevan más tiempo en la etapa.`}
        // Ronda 30 (el mismo número nunca dos veces): sin la insignia «N deudores»; lo dice el paginador.
      />

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.debtor_id}
        isLoading={result.isLoading}
        error={result.error}
        onReintentar={result.refetch}
        emptyTitle={`No hay deudores en ${etapa.nombre.toLowerCase()}`}
        emptyHint={tenant ? 'Prueba quitando el filtro de inmobiliaria.' : undefined}
        emptyIcon={<Wallet weight="duotone" />}
        aria-label={`Deudores en ${etapa.nombre}`}
        barra={
          // El filtro sólo con más de una inmobiliaria en la etapa.
          showFilter ? (
            <BarraDeFiltros>
              <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria">
                <Desplegable
                  id="filtro-inmobiliaria"
                  value={tenant}
                  onChange={(v) => setFilters({ tenant: v }, { resetPage: true })}
                  todas="Todas las inmobiliarias"
                  opciones={stageTenants.map((t) => ({ valor: t.tenant_id, nombre: t.legal_name }))}
                />
              </Filtro>
            </BarraDeFiltros>
          ) : undefined
        }
        paginacion={result.data ? { page, total: result.data.total, pageSize: PAGE_SIZE, onPage: setPage } : undefined}
        queSon={['deudor', 'deudores']}
        // Ronda 30 (regla de Nico: tablas con buscador): el servidor no busca por nombre, así que el buscador mira
        // la página que llegó (y lo dice).
        buscar="Buscar deudor en esta página"
        filtrosEnLaUrl={['tenant']}
      />
    </div>
  )
}
