'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { CheckCircle } from '@phosphor-icons/react'
import { estadoDelProceso } from '@/lib/admin/textos-del-admin'

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
    texto: (r) => estadoDelProceso(r.status),
    cell: (r) => <Pill tone="bad">{estadoDelProceso(r.status)}</Pill>,
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
    texto: (r) => estadoDelProceso(r.status),
    cell: (r) => <Pill tone="warn">{estadoDelProceso(r.status)}</Pill>,
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
    texto: (r) => estadoDelProceso(r.legal_status),
    cell: (r) => <Pill tone="bad">{estadoDelProceso(r.legal_status)}</Pill>,
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
        description="Lo que se cayó y espera a alguien: reportes a centrales, sincronización con los CRM y paquetes legales. Sólo lectura."
      />

      {isLoading && <LoadingBlock />}
      {!isLoading && error && <ErrorBlock error={error} onReintentar={refetch} />}

      {data && (
        <>
          {/* Glow up 22-10: LA RESPUESTA (cuánto espera a alguien) en una cifra con la barra por tipo; sin nada
              caído, sólo el vacío (antes salían además las tres tablas vacías). */}
          {total > 0 ? (
            <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
              <CifraHeroe
                rotulo="Esperan a alguien"
                cifra={total.toLocaleString('es-CO')}
                contexto={total === 1 ? 'proceso caído' : 'procesos caídos'}
                tramos={[
                  { clave: 'centrales', etiqueta: 'Centrales de riesgo', monto: central.length, tono: 'critico', cifra: String(central.length), siempre: true },
                  { clave: 'crm', etiqueta: 'Sincronización con CRM', monto: crm.length, tono: 'aviso', cifra: String(crm.length), siempre: true },
                  { clave: 'legal', etiqueta: 'Legal atascado más de 72 h', monto: legal.length, tono: 'critico', cifra: String(legal.length), siempre: true },
                ]}
                total={total}
                data-testid="procesos-fallidos"
              />
            </div>
          ) : null}

          {total === 0 && (
            <EmptyBlock
              icono={<CheckCircle weight="duotone" />}
              tono="exito"
              title="No hay nada caído"
              hint="Los reportes a las centrales, la sincronización con los CRM y los paquetes legales están al día."
            />
          )}

          {/* Centrales */}
          {central.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-subtitle font-medium text-fg">Centrales de riesgo: Datacrédito y TransUnion</h2>
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
          {crm.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-subtitle font-medium text-fg">Sincronización con CRM: Wasi, Domus, WebProp y Sinco</h2>
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
          {legal.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-subtitle font-medium text-fg">Legal atascado más de 72 h: Certicámara sin acuse</h2>
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
