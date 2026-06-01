// Phase 32 plan 32-07 (COBR-UI-05) — read-only payment detail page.
// Server component: wraps content in PageGuard module="cobranza" action="view".
//
// Deviation note (Rule 3 — blocking):
//   Phase 32-05 ships only the list endpoint GET /cobranza/pagos.
//   No GET /cobranza/pagos/{paymentId} exists yet in the agent OpenAPI spec.
//   Per plan, we render a graceful "Payment not found" state with a back link.
//   When the single-payment endpoint lands in a future phase, replace the
//   `payment = null` line with a server-side fetch using cookies() and the
//   typed paths['/api/agency/{agencyId}/cobranza/pagos/{paymentId}']['get'].

import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'

export const metadata: Metadata = {
  title: 'Pago · Cobranza',
}

type PaymentDetailData = {
  id: string
  amount: number
  feeCop: number | null
  provider: 'wompi' | 'bold'
  status: 'approved' | 'pending' | 'declined' | 'disbursed'
  createdAt: string
  paymentPlanId: string | null
  debtor: {
    id: string
    fullName: string
    cedulaMasked: string
    phoneMasked: string
    emailMasked: string | null
  }
}

async function fetchPaymentDetail(_paymentId: string): Promise<PaymentDetailData | null> {
  // Endpoint not available in spec 0.1.3 (Phase 32-05 ships list only).
  // Return null so the not-found UI renders. Replace with server-side
  // fetch (cookies() + typed client) when the endpoint lands.
  return null
}

const copFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

async function PaymentDetailContent({ paymentId }: { paymentId: string }) {
  const payment = await fetchPaymentDetail(paymentId)

  if (!payment) {
    return (
      <main className="p-4 lg:p-8 max-w-3xl mx-auto">
        <Link
          href="/panel/inmobiliaria/ai/cobranza/pagos"
          data-testid="pagos-detail-back"
          className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
        >
          ← Volver a pagos
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          Detalle de pago
        </h1>
        <div className="mt-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Pago no encontrado (ID: <span className="font-mono">{paymentId}</span>)
          </p>
          <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            El detalle individual de pago todavía no está disponible en este entorno.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/panel/inmobiliaria/ai/cobranza/pagos"
        data-testid="pagos-detail-back"
        className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
      >
        ← Volver a pagos
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
        Detalle de pago
      </h1>

      <div className="mt-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Monto
          </p>
          <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
            {formatCop(payment.amount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Comisión
          </p>
          <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
            {formatCop(payment.feeCop)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Proveedor
          </p>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white capitalize">
            {payment.provider}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Estado
          </p>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white capitalize">
            {payment.status}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Fecha
          </p>
          <p className="mt-1 text-sm text-neutral-900 dark:text-white">
            {new Date(payment.createdAt).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Deudor
          </p>
          <div className="mt-1">
            <Mask field="cedula" value={payment.debtor.fullName} />
          </div>
        </div>
        {payment.paymentPlanId && (
          <div className="sm:col-span-2">
            <Link
              href={`/panel/inmobiliaria/ai/cobranza/pagos/planes/${payment.paymentPlanId}`}
              className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
            >
              Ver plan de pagos asociado →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>
}) {
  const { paymentId } = await params
  return (
    <PageGuard module="cobranza" action="view">
      <Suspense fallback={<PageSkeleton variant="detail" />}>
        <PaymentDetailContent paymentId={paymentId} />
      </Suspense>
    </PageGuard>
  )
}
