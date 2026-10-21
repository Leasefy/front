'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { ArrowsClockwise, CheckCircle, IdentificationCard, Scales } from '@phosphor-icons/react'
import { legible } from '@/lib/admin/textos-del-admin'
import { FranjaDeCifras, MonoLabel } from '@leasefy/cadence'

// ─── Types (match ADMIN-API-CONTRACT.md — Failed states) ───────────────────

/** central_reports / crm_sync_events WHERE status='failed'. */
interface FailedRow {
  id: string
  status: string
  created_at: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
}

/** legal_packages WHERE legal_status='PENDING_RECEIPT' AND issued_at < now-72h. */
interface LegalPackageRow {
  id: string
  legal_status: string
  issued_at: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
}

/** GET /api/v1/admin/failed-states — three buckets, each ≤50 rows. */
interface FailedStatesResponse {
  centralReports: FailedRow[]
  crmSyncEvents: FailedRow[]
  legalPackages: LegalPackageRow[]
}

/** Hours elapsed since an ISO timestamp (client-side; back doesn't send age). */
function ageHours(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 3_600_000) : 0
}

// ─── Column definitions ─────────────────────────────────────────────────────

const centralColumns: Column<FailedRow>[] = [
  {
    header: 'Estado',
    orden: (r) => r.status,
    texto: (r) => legible(r.status),
    cell: (r) => <Pill tone="bad">{legible(r.status)}</Pill>,
  },
  {
    header: 'Deudor',
    orden: (r) => r.debtor_name,
    texto: (r) => r.debtor_name,
    cell: (r) => <span className="truncate max-w-[200px] block">{r.debtor_name ?? '—'}</span>,
  },
  {
    header: 'Inmobiliaria',
    orden: (r) => r.legal_name,
    texto: (r) => r.legal_name,
    cell: (r) => <span className="block max-w-[180px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
  },
  {
    header: 'Cuándo',
    align: 'right',
    orden: (r) => r.created_at,
    ordenPrimero: 'desc',
    texto: (r) => fmtDateTime(r.created_at),
    cell: (r) => <span className="whitespace-nowrap font-mono text-caption text-fg-muted tabular-nums">{fmtDateTime(r.created_at)}</span>,
  },
]

const crmColumns: Column<FailedRow>[] = [
  {
    header: 'Estado',
    orden: (r) => r.status,
    texto: (r) => legible(r.status),
    cell: (r) => <Pill tone="warn">{legible(r.status)}</Pill>,
  },
  {
    header: 'Deudor',
    orden: (r) => r.debtor_name,
    texto: (r) => r.debtor_name,
    cell: (r) => <span className="truncate max-w-[200px] block">{r.debtor_name ?? '—'}</span>,
  },
  {
    header: 'Inmobiliaria',
    orden: (r) => r.legal_name,
    texto: (r) => r.legal_name,
    cell: (r) => <span className="block max-w-[180px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
  },
  {
    header: 'Cuándo',
    align: 'right',
    orden: (r) => r.created_at,
    ordenPrimero: 'desc',
    texto: (r) => fmtDateTime(r.created_at),
    cell: (r) => <span className="whitespace-nowrap font-mono text-caption text-fg-muted tabular-nums">{fmtDateTime(r.created_at)}</span>,
  },
]

const legalColumns: Column<LegalPackageRow>[] = [
  {
    header: 'Estado',
    orden: (r) => r.legal_status,
    texto: (r) => legible(r.legal_status),
    cell: (r) => <Pill tone="bad">{legible(r.legal_status)}</Pill>,
  },
  {
    header: 'Deudor',
    orden: (r) => r.debtor_name,
    texto: (r) => r.debtor_name,
    cell: (r) => <span className="truncate max-w-[200px] block">{r.debtor_name ?? '—'}</span>,
  },
  {
    header: 'Inmobiliaria',
    orden: (r) => r.legal_name,
    texto: (r) => r.legal_name,
    cell: (r) => <span className="block max-w-[180px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
  },
  {
    header: 'Lleva',
    align: 'right',
    orden: (r) => ageHours(r.issued_at),
    ordenPrimero: 'desc',
    texto: (r) => ageHours(r.issued_at),
    cell: (r) => <span className="tabular-nums font-mono text-caption text-danger">{ageHours(r.issued_at)} h</span>,
  },
  {
    header: 'Emitido',
    align: 'right',
    orden: (r) => r.issued_at,
    ordenPrimero: 'desc',
    texto: (r) => fmtDateTime(r.issued_at),
    cell: (r) => <span className="whitespace-nowrap font-mono text-caption text-fg-muted tabular-nums">{fmtDateTime(r.issued_at)}</span>,
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────

/** /failed-states — ops inbox (BACK.md §8.17 · FRONT.md §6.20). */
export default function FailedStatesPage() {
  const { data, isLoading, error, refetch } = useApiQuery<FailedStatesResponse>(
    (signal) => adminApi('/failed-states', { signal }),
    [],
  )

  const central = data?.centralReports ?? []
  const crm     = data?.crmSyncEvents ?? []
  const legal   = data?.legalPackages ?? []
  const total   = central.length + crm.length + legal.length

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Procesos fallidos"
        description="Lo que se cayó y espera a alguien: reportes a centrales de riesgo, sincronización con los CRM y paquetes legales atascados más de 72 horas. Sólo lectura."
      />

      {isLoading && <LoadingBlock />}
      {!isLoading && error && <ErrorBlock error={error} onReintentar={refetch} />}

      {data && (
        <>
          {/* Counters */}
          <FranjaDeCifras fila="lg">
            <KpiCard
              icon={<IdentificationCard />}
              label="Centrales de riesgo"
              value={central.length}
              hint="Datacrédito / TransUnion"
              tone={central.length > 0 ? 'bad' : 'ok'}
            />
            <KpiCard
              icon={<ArrowsClockwise />}
              label="Sincronización con CRM"
              value={crm.length}
              hint="Wasi / Domus / WebProp / Sinco"
              tone={crm.length > 0 ? 'warn' : 'ok'}
            />
            <KpiCard
              icon={<Scales />}
              label="Legal atascado · más de 72 h"
              value={legal.length}
              hint="Certicámara sin acuse de recibo"
              tone={legal.length > 0 ? 'bad' : 'ok'}
            />
          </FranjaDeCifras>

          {total === 0 && (
            <EmptyBlock icono={<CheckCircle weight="bold" />} title="No hay nada caído" hint="Todo lo de abajo está al día." />
          )}

          {/* Centrales */}
          {(central.length > 0 || total === 0) && (
            <section className="space-y-3">
              <MonoLabel className="block">
                Centrales de riesgo — Datacrédito y TransUnion
              </MonoLabel>
              <DataTable
                id="centrales"
                columns={centralColumns}
                rows={central}
                getKey={(r) => r.id}
                emptyTitle="Nada fallido con las centrales"
                aria-label="Reportes a centrales que fallaron"
                queSon={['reporte', 'reportes']}
                buscar="Deudor o inmobiliaria"
                filasPorPagina={10}
                ordenInicial={{ columna: 3, sentido: 'desc' }}
                exportar="centrales-fallidas"
              />
            </section>
          )}

          {/* CRM */}
          {(crm.length > 0 || total === 0) && (
            <section className="space-y-3">
              <MonoLabel className="block">
                Sincronización con CRM — Wasi, Domus, WebProp y Sinco
              </MonoLabel>
              <DataTable
                id="crm"
                columns={crmColumns}
                rows={crm}
                getKey={(r) => r.id}
                emptyTitle="Nada fallido con los CRM"
                aria-label="Sincronizaciones con CRM que fallaron"
                queSon={['sincronización', 'sincronizaciones']}
                buscar="Deudor o inmobiliaria"
                filasPorPagina={10}
                ordenInicial={{ columna: 3, sentido: 'desc' }}
                exportar="crm-fallidos"
              />
            </section>
          )}

          {/* Legal */}
          {(legal.length > 0 || total === 0) && (
            <section className="space-y-3">
              <MonoLabel className="block">
                Legal atascado más de 72 h — Certicámara sin acuse
              </MonoLabel>
              <DataTable
                id="legal"
                columns={legalColumns}
                rows={legal}
                getKey={(r) => r.id}
                emptyTitle="Ningún paquete atascado"
                aria-label="Paquetes legales atascados"
                queSon={['paquete', 'paquetes']}
                buscar="Deudor o inmobiliaria"
                filasPorPagina={10}
                ordenInicial={{ columna: 3, sentido: 'desc' }}
                exportar="legal-atascado"
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}
