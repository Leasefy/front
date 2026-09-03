'use client'

/**
 * PaymentDetailClient — wiring for the read-only-plus-verify payment detail.
 *
 * Data: GET /api/agency/{agencyId}/cobranza/pagos/{paymentId} (PII masked).
 * Action: "Verificar pago" → POST .../verify (action="approve"). Human-only
 * confirmation (T-323): the operator must click the real button; nothing
 * auto-executes. Only self-reported payments are verifiable.
 *
 * Fail-soft: if the backend isn't deployed / migration not applied, the GET
 * degrades to { payment: null } → 404 → the EmptyState fallback renders
 * (exactly the screen's prior locked state). Never breaks, never shows a raw
 * error for the not-found path.
 */

import Link from 'next/link'

import { CurrencyCircleDollar } from '@phosphor-icons/react'

import { Button } from '@/components/ui'
import { StatusBadge, type SemanticTone } from '@leasefy/cadence'
import { EmptyState } from '@/components/data-display/EmptyState'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { usePaymentDetail } from '@/lib/hooks/cobranza/use-payment-detail'

const BACK_HREF = '/panel/inmobiliaria/cobros/cobranza/pagos'

const copFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Free-form status (pending | approved | declined | voided | refunded |
// self_reported) → DS semantic tone + Spanish label.
function statusTone(status: string): SemanticTone {
  switch (status) {
    case 'approved':
      return 'success'
    case 'self_reported':
      return 'warning'
    case 'declined':
    case 'voided':
      return 'critical'
    default:
      return 'neutral'
  }
}

/**
 * `status = 'pending'` tapa DOS hechos: una obligación importada de cartera
 * —lo que el deudor DEBE, donde nunca entró un peso— y un pago en camino que
 * la pasarela todavía no confirma. La lista de Pagos los separa desde que
 * existe `kind`; el detalle seguía diciendo «Pendiente» para los dos, que se
 * lee como «ya lo pagó, falta confirmar».
 */
function statusLabel(status: string, paymentMethod?: string | null): string {
  if (status === 'pending') {
    return paymentMethod === 'cartera_import' ? 'Por cobrar' : 'En proceso'
  }
  switch (status) {
    case 'approved':
      return 'Aprobado'
    case 'self_reported':
      return 'Reportado por el deudor'
    case 'declined':
      return 'Rechazado'
    case 'voided':
      return 'Anulado'
    case 'refunded':
      return 'Reembolsado'
    default:
      return status
  }
}

/** El `payment_method` crudo no es texto para nadie. */
function metodoEnEspanol(metodo: string | null | undefined): string {
  if (!metodo) return '—'
  switch (metodo) {
    case 'cartera_import':
      return 'Importado de la cartera'
    case 'wompi':
      return 'Link de pago (Wompi)'
    case 'bold':
      return 'Link de pago (Bold)'
    case 'pse':
      return 'PSE'
    case 'transferencia':
      return 'Transferencia bancaria'
    case 'efectivo':
      return 'Efectivo / ventanilla'
    default:
      return metodo.replace(/_/g, ' ')
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-fg-muted uppercase tracking-wide">{label}</p>
      <div className="mt-1 text-sm text-fg">{children}</div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href={BACK_HREF}
      data-testid="pagos-detail-back"
      className="text-primary underline-offset-4 hover:underline font-medium text-xs"
    >
      ← Volver a pagos
    </Link>
  )
}

export default function PaymentDetailClient({ paymentId }: { paymentId: string }) {
  const { data, isLoading, verifyPayment, isVerifying } = usePaymentDetail({ paymentId })

  if (isLoading) {
    return <PageSkeleton variant="detail" />
  }

  // Fail-soft fallback: no payment (404 / unmigrated / no backend) → EmptyState.
  if (!data) {
    return (
      <main className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <BackLink />
        <h1 className="text-h2 text-fg">Detalle de pago</h1>
        <EmptyState
          icon={CurrencyCircleDollar}
          title="Pago no disponible"
          description="No encontramos el detalle de este pago. Puede que aún no esté disponible en este entorno."
          primaryCta={{ label: 'Volver a pagos', href: BACK_HREF }}
        />
      </main>
    )
  }

  const isVerifiable = data.status === 'self_reported'
  const provider = data.paymentProvider ?? '—'

  const handleVerify = async () => {
    await verifyPayment('approve')
  }

  return (
    <main className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <BackLink />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">Detalle de pago</h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            Información del pago, su estado y verificación.
          </p>
        </div>
        {isVerifiable && (
          <div className="shrink-0">
            <Button
              hideArrow
              onClick={() => void handleVerify()}
              isLoading={isVerifying}
              disabled={isVerifying}
              data-testid="pago-verify-btn"
            >
              Verificar pago
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Monto">
          <span className="text-lg font-semibold text-fg">{formatCop(data.amount)}</span>
        </Field>

        <Field label="Estado">
          <StatusBadge tone={statusTone(data.status)}>
            {statusLabel(data.status, data.paymentMethod)}
          </StatusBadge>
        </Field>

        <Field label="Proveedor">
          <span className="capitalize">{provider}</span>
        </Field>

        <Field label="Método">
          {/* `capitalize` sobre el valor crudo pintaba «Cartera_import». */}
          <span>{metodoEnEspanol(data.paymentMethod)}</span>
        </Field>

        <Field label="Deudor">
          <Mask field="cedula" value={data.debtor.fullName} />
        </Field>

        <Field label="Cédula">
          <span className="font-mono text-xs">{data.debtor.cedulaMasked}</span>
        </Field>

        <Field label="Fecha de creación">{formatDate(data.createdAt)}</Field>

        <Field label="Fecha de pago">{formatDate(data.paidAt)}</Field>

        {data.selfReportedAt && (
          <Field label="Reportado el">{formatDate(data.selfReportedAt)}</Field>
        )}

        {data.selfReportedBy && (
          <Field label="Reportado por">
            <span className="break-all">{data.selfReportedBy}</span>
          </Field>
        )}

        {data.verifiedAt && (
          <Field label="Verificado el">{formatDate(data.verifiedAt)}</Field>
        )}

        {data.verifiedByUserId && (
          <Field label="Verificado por">
            <span className="break-all">{data.verifiedByUserId}</span>
          </Field>
        )}

        {data.comprobanteUrl && (
          <Field label="Comprobante">
            <a
              href={data.comprobanteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline font-medium"
              data-testid="pago-comprobante-link"
            >
              Ver comprobante →
            </a>
          </Field>
        )}
      </div>
    </main>
  )
}
