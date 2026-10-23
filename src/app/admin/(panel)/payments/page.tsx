'use client'

import Link from 'next/link'
import { CheckCircle, CreditCard } from '@phosphor-icons/react'
import { Alert, Cifra, FranjaDeCifras } from '@leasefy/cadence'
import { adminApi, traerTodasLasPaginas } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtCOP, fmtDateTime, fmtFecha } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { LoadingBlock } from '@/components/admin/screen/states'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { ESTADO_DEL_PAGO, estadoDelPago, pasarela, tonoDelPago } from '@/lib/admin/textos-del-admin'

const PAGE_SIZE = 50

// ── Types ──────────────────────────────────────────────────────────────────

interface PaymentKpis {
  approved_count: string
  approved_total: string
  pending_count: string
  declined_count: string
  refunded_count: string
  disbursed_count: string
  disbursed_total: string
  pending_disbursement_count: string
  fees_total: string
}

interface PaymentRow {
  id: string
  amount: string
  status: string
  provider: string | null
  paid_at: string | null
  created_at: string
  disbursement_status: string | null
  disbursed_at: string | null
  fee_amount: string | null
  invoice_cufe: string | null
  debtor_name: string
  legal_name: string | null
}

interface PaymentsResponse extends Paginated<PaymentRow> {
  kpis: PaymentKpis
}

// ── Helpers ────────────────────────────────────────────────────────────────

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function DisbursementCell({ status, disbursedAt }: { status: string | null; disbursedAt: string | null }) {
  if (status === 'disbursed') {
    const dateOnly = disbursedAt ? fmtFecha(disbursedAt) : ''
    return (
      <span className="inline-flex items-center gap-1.5 text-success">
        <CheckCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
        <span className="font-mono text-caption tabular-nums">{dateOnly}</span>
      </span>
    )
  }
  if (status === 'pending') return <Pill tone="warn">Por desembolsar</Pill>
  return <span className="text-fg-subtle">—</span>
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /payments — Wompi / Bold payment funnel with KPIs (FRONT.md §6.15 · BACK.md §8.7). */
export default function PaymentsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const status   = get('status')
  const provider = get('provider')

  const result = useApiQuery<PaymentsResponse>(
    (signal) =>
      adminApi('/payments', { query: { status, provider, page }, signal }),
    [status, provider, page],
  )

  const kpis = result.data?.kpis

  const columns: Column<PaymentRow>[] = [
    {
      header: 'Deudor',
      texto: (r) => r.debtor_name,
      cell: (r) => <span className="block max-w-[180px] truncate font-medium text-fg">{r.debtor_name}</span>,
    },
    {
      header: 'Inmobiliaria',
      texto: (r) => r.legal_name,
      cell: (r) => <span className="block max-w-[160px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Estado',
      texto: (r) => estadoDelPago(r.status),
      cell: (r) => <Pill tone={tonoDelPago(r.status)}>{estadoDelPago(r.status)}</Pill>,
    },
    {
      header: 'Pasarela',
      texto: (r) => (r.provider ? pasarela(r.provider) : ''),
      cell: (r) => <span className="text-fg-muted">{r.provider ? pasarela(r.provider) : '—'}</span>,
    },
    {
      header: 'Valor',
      align: 'right',
      texto: (r) => num(r.amount),
      cell: (r) => <span className="font-mono tabular-nums text-fg">{fmtCOP(num(r.amount))}</span>,
    },
    {
      header: 'Comisión',
      align: 'right',
      texto: (r) => (r.fee_amount ? num(r.fee_amount) : null),
      cell: (r) => (
        <span className="font-mono text-caption tabular-nums text-fg-muted">{r.fee_amount ? fmtCOP(num(r.fee_amount)) : '—'}</span>
      ),
    },
    {
      header: 'Desembolso',
      texto: (r) =>
        r.disbursement_status === 'disbursed'
          ? `Desembolsado ${r.disbursed_at ? fmtDateTime(r.disbursed_at) : ''}`
          : r.disbursement_status === 'pending'
            ? 'Por desembolsar'
            : '',
      cell: (r) => <DisbursementCell status={r.disbursement_status} disbursedAt={r.disbursed_at} />,
    },
    {
      header: 'Pagado',
      align: 'right',
      texto: (r) => fmtDateTime(r.paid_at ?? r.created_at),
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.paid_at ?? r.created_at)}</span>
      ),
    },
  ]

  const pendingDisbursementCount = num(kpis?.pending_disbursement_count)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Pagos"
        description="Los pagos en línea de los últimos 30 días (Wompi y Bold) y si ya se le giraron a la inmobiliaria."
      />

      {pendingDisbursementCount > 0 && (
        <Alert variant="warning" title="Pagos sin desembolsar">
          <span className="font-mono tabular-nums">{pendingDisbursementCount.toLocaleString('es-CO')}</span>{' '}
          {pendingDisbursementCount === 1 ? 'pago aprobado lleva' : 'pagos aprobados llevan'} más de 3 días sin
          desembolsarse. Revisa la dispersión diaria en{' '}
          <Link href="/admin/inngest-monitor" className="font-medium text-fg underline underline-offset-4">
            Tareas programadas
          </Link>
          .
        </Alert>
      )}

      {/* Glow up 22-10: LA RESPUESTA en una cifra (lo aprobado en 30 días) y tres cifras más, sin tonos ni íconos
          de color; antes, 4 tarjetas del mismo peso pintadas de verde, ámbar y rojo. */}
      {result.isLoading && !kpis ? (
        <LoadingBlock label="Cargando los pagos" filas={3} />
      ) : kpis ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <CifraHeroe
              rotulo="Aprobado en 30 días"
              cifra={fmtCOP(num(kpis.approved_total))}
              contexto={`en ${num(kpis.approved_count).toLocaleString('es-CO')} ${num(kpis.approved_count) === 1 ? 'pago' : 'pagos'}`}
              data-testid="pagos-aprobado"
            />
          </div>
          <FranjaDeCifras fila="lg" columnas={3} aria-label="El embudo de los pagos">
            <Cifra
              etiqueta="Desembolsado"
              valor={fmtCOP(num(kpis.disbursed_total))}
              detalle={`${num(kpis.disbursed_count).toLocaleString('es-CO')} giros · comisiones ${fmtCOP(num(kpis.fees_total))}`}
            />
            <Cifra
              etiqueta="Pendientes"
              valor={num(kpis.pending_count)}
              detalle="esperando la respuesta de la pasarela"
              tono={num(kpis.pending_count) > 0 ? 'aviso' : undefined}
            />
            <Cifra
              etiqueta="Rechazados"
              valor={num(kpis.declined_count)}
              detalle={`${num(kpis.refunded_count).toLocaleString('es-CO')} reembolsados`}
            />
          </FranjaDeCifras>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.id}
        isLoading={result.isLoading}
        error={result.error}
        onReintentar={result.refetch}
        emptyTitle={status || provider ? 'No hay pagos con estos filtros' : 'Todavía no hay pagos en línea'}
        emptyHint={status || provider ? 'Prueba con otro estado u otra pasarela.' : 'Cuando un inquilino pague por Wompi, aparece aquí.'}
        emptyIcon={<CreditCard weight="duotone" />}
        aria-label="Pagos"
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Estado" htmlFor="filtro-estado">
              <Desplegable
                id="filtro-estado"
                value={status}
                onChange={(v) => setFilters({ status: v }, { resetPage: true })}
                todas="Todos los estados"
                opciones={Object.entries(ESTADO_DEL_PAGO).map(([valor, nombre]) => ({ valor, nombre }))}
              />
            </Filtro>
            <Filtro etiqueta="Pasarela" htmlFor="filtro-pasarela">
              <Desplegable
                id="filtro-pasarela"
                value={provider}
                onChange={(v) => setFilters({ provider: v }, { resetPage: true })}
                todas="Todas las pasarelas"
                opciones={[
                  { valor: 'wompi', nombre: 'Wompi' },
                  { valor: 'bold', nombre: 'Bold' },
                ]}
              />
            </Filtro>
          </BarraDeFiltros>
        }
        paginacion={result.data ? { page, total: result.data.total, pageSize: PAGE_SIZE, onPage: setPage } : undefined}
        queSon={['pago', 'pagos']}
        filtrosEnLaUrl={['status', 'provider']}
        exportar="pagos-en-linea"
        traerTodoParaElExcel={() => traerTodasLasPaginas<PaymentRow>('/payments', { status, provider })}
        masEnElExcel={[{ header: 'CUFE de la factura', texto: (r) => r.invoice_cufe }]}
      />
    </div>
  )
}
