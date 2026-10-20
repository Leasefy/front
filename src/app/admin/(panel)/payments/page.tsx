'use client'

import { CheckCircle, CreditCard, CurrencyCircleDollar, HourglassMedium, Prohibit, X } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import type { Paginated, PillTone } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { Pill } from '@/components/admin/Pill'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { Button } from '@/components/ui/button'
import { legible } from '@/lib/admin/textos-del-admin'

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

function statusTone(s: string): PillTone {
  switch (s) {
    case 'approved': return 'ok'
    case 'pending':  return 'warn'
    case 'declined':
    case 'voided':
    case 'refunded': return 'bad'
    default:         return 'neutral'
  }
}

const ESTADO_DEL_PAGO: Record<string, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  declined: 'Rechazado',
  voided: 'Anulado',
  refunded: 'Reembolsado',
}

function DisbursementCell({ status, disbursedAt }: { status: string | null; disbursedAt: string | null }) {
  if (status === 'disbursed') {
    const dateOnly = disbursedAt ? fmtDateTime(disbursedAt).split(',')[0] : ''
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
      cell: (r) => <span className="block max-w-[180px] truncate font-medium text-fg">{r.debtor_name}</span>,
    },
    {
      header: 'Inmobiliaria',
      cell: (r) => <span className="block max-w-[160px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Estado',
      cell: (r) => <Pill tone={statusTone(r.status)}>{ESTADO_DEL_PAGO[r.status] ?? legible(r.status)}</Pill>,
    },
    {
      header: 'Pasarela',
      cell: (r) => <span className="text-fg-muted">{r.provider ? legible(r.provider) : '—'}</span>,
    },
    {
      header: 'Valor',
      align: 'right',
      cell: (r) => <span className="font-mono font-medium tabular-nums">{fmtCOP(num(r.amount))}</span>,
    },
    {
      header: 'Comisión',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-caption tabular-nums text-fg-muted">{r.fee_amount ? fmtCOP(num(r.fee_amount)) : '—'}</span>
      ),
    },
    {
      header: 'Desembolso',
      cell: (r) => <DisbursementCell status={r.disbursement_status} disbursedAt={r.disbursed_at} />,
    },
    {
      header: 'Pagado',
      align: 'right',
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
        description="El embudo de los pagos en línea (Wompi y Bold) de los últimos 30 días: aprobados, pendientes, rechazados, reembolsados y desembolsados."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          tone="ok"
          icon={<CheckCircle />}
          label="Aprobado · 30 días"
          value={result.isLoading ? '—' : fmtCOP(num(kpis?.approved_total))}
          hint={`${num(kpis?.approved_count).toLocaleString('es-CO')} pagos`}
        />
        <KpiCard
          tone="warn"
          icon={<HourglassMedium />}
          label="Pendientes"
          value={result.isLoading ? '—' : num(kpis?.pending_count)}
          hint="Esperando la respuesta de la pasarela"
        />
        <KpiCard
          tone="bad"
          icon={<Prohibit />}
          label="Rechazados · 30 días"
          value={result.isLoading ? '—' : num(kpis?.declined_count)}
          hint={`${num(kpis?.refunded_count).toLocaleString('es-CO')} reembolsados`}
        />
        <KpiCard
          icon={<CurrencyCircleDollar />}
          label="Desembolsado · 30 días"
          value={result.isLoading ? '—' : fmtCOP(num(kpis?.disbursed_total))}
          hint={`${num(kpis?.disbursed_count).toLocaleString('es-CO')} giros · comisiones ${fmtCOP(num(kpis?.fees_total))}`}
        />
      </div>

      {pendingDisbursementCount > 0 && (
        <Alert variant="warning" title="Pagos sin desembolsar">
          <span className="font-mono tabular-nums">{pendingDisbursementCount.toLocaleString('es-CO')}</span>{' '}
          {pendingDisbursementCount === 1 ? 'pago aprobado lleva' : 'pagos aprobados llevan'} más de 3 días sin
          desembolsarse. Revisa la tarea diaria de dispersión (daily-dispersion).
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.id}
        isLoading={result.isLoading}
        error={result.error}
        onReintentar={result.refetch}
        emptyTitle="No hay pagos con estos filtros"
        emptyHint="Prueba con otro estado u otra pasarela."
        emptyIcon={<CreditCard weight="bold" />}
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
            {status || provider ? (
              <Button variant="ghost" hideArrow onClick={() => setFilters({ status: '', provider: '' }, { resetPage: true })}>
                <X className="h-4 w-4" aria-hidden="true" />
                Quitar los filtros
              </Button>
            ) : null}
          </BarraDeFiltros>
        }
        pie={result.data ? <Pagination page={page} total={result.data.total} pageSize={PAGE_SIZE} onPage={setPage} /> : null}
      />
    </div>
  )
}
