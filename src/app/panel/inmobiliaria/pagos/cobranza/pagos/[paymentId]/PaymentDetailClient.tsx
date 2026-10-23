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

import { useEffect } from 'react'
import Link from 'next/link'

import { CurrencyCircleDollar } from '@phosphor-icons/react'

import { Button, toast } from '@/components/ui'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { BackButton, CrossFade, StatusBadge, type SemanticTone } from '@leasefy/cadence'
import { EmptyState } from '@/components/data-display/EmptyState'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { usePaymentDetail, type PaymentDetailResponse } from '@/lib/hooks/cobranza/use-payment-detail'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { fechaCorta, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'

const BACK_HREF = '/panel/inmobiliaria/pagos/cobranza/pagos'

const copFormat = plataEnPantalla(localeDeLasCifras, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

// VOZ §4 (revisora r25): «17 oct 2026», el formato de la casa, en vez de toLocaleDateString.
function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return fechaCorta(diaEnColombia(value))
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
      return 'Enlace de pago (Wompi)'
    case 'bold':
      return 'Enlace de pago (Bold)'
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
      <p className="text-caption text-fg-muted">{label}</p>
      <div className="mt-1 text-sm text-fg">{children}</div>
    </div>
  )
}

function BackLink() {
  return (
    // C4 (r25): la vuelta de la casa (BackButton), como en Siniestros y Escalaciones.
    <BackButton variant="subtle" href={BACK_HREF} data-testid="pagos-detail-back" label="Volver a Pagos en línea" />
  )
}

/**
 * Los datos del pago: los usa la página y el cajón de la lista (revisora r25:
 * «el detalle abre una página»; ahora se mira en un cajón sin salir de la lista).
 */
function CamposDelPago({ data }: { data: PaymentDetailResponse }) {
  const provider = data.paymentProvider ?? '—'
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Pasarela">
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
          <span className="font-mono text-caption">{data.debtor.cedulaMasked}</span>
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
              className="text-fg underline underline-offset-2 font-medium"
              data-testid="pago-comprobante-link"
            >
              Ver comprobante
            </a>
          </Field>
        )}
    </div>
  )
}

export default function PaymentDetailClient({ paymentId }: { paymentId: string }) {
  const { data, isLoading, verifyPayment, isVerifying, falloDeVerificacion, limpiarFalloDeVerificacion } =
    usePaymentDetail({ paymentId })

  // Antes un fallo al verificar no decía nada: el botón volvía a su estado y
  // el pago seguía «reportado» sin que nadie supiera por qué.
  useEffect(() => {
    if (!falloDeVerificacion) return
    toast.error(
      mensajeParaLaPersona(falloDeVerificacion, {
        porDefecto: 'No pudimos verificar el pago.',
        accion: 'verificar el pago',
      }),
    )
    limpiarFalloDeVerificacion()
  }, [falloDeVerificacion, limpiarFalloDeVerificacion])

  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // pago, → no disponible); lo que ya estaba al montarse no se anima.
  if (isLoading) {
    return (
      <CrossFade swapKey="esqueleto">
        <PageSkeleton variant="detail" />
      </CrossFade>
    )
  }

  // Fail-soft fallback: no payment (404 / unmigrated / no backend) → EmptyState.
  if (!data) {
    return (
      <CrossFade swapKey="no-disponible">
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <BackLink />
        <EncabezadoDePantalla seccion="Cobranza" titulo="Detalle de pago" />
        <EmptyState
          icon={CurrencyCircleDollar}
          title="Pago no disponible"
          description="No encontramos el detalle de este pago. Puede que aún no esté disponible en este entorno."
          primaryCta={{ label: 'Volver a Pagos en línea', href: BACK_HREF }}
        />
      </div>
      </CrossFade>
    )
  }

  const isVerifiable = data.status === 'self_reported'

  const handleVerify = async () => {
    await verifyPayment('approve')
  }

  return (
    <CrossFade swapKey="pago">
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <BackLink />

      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo="Detalle de pago"
        descripcion={
          isVerifiable
            ? 'El inquilino dice que ya pagó: revisa el comprobante y verifícalo.'
            : 'El monto, su estado y quién lo verificó.'
        }
        junto={
          <StatusBadge tone={statusTone(data.status)}>
            {statusLabel(data.status, data.paymentMethod)}
          </StatusBadge>
        }
        accionPrincipal={
          isVerifiable ? (
            <Button
              size="sm"
              hideArrow
              onClick={() => void handleVerify()}
              isLoading={isVerifying}
              disabled={isVerifying}
              data-testid="pago-verify-btn"
            >
              Verificar pago
            </Button>
          ) : undefined
        }
      />

      <CifraHeroe rotulo="Monto" cifra={formatCop(data.amount)} tamano="mediana" data-testid="pago-monto" />

      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <CamposDelPago data={data} />
      </div>
    </div>
    </CrossFade>
  )
}

/**
 * El detalle del pago en un cajón, para mirarlo sin salir de la lista
 * (revisora r25, Pagos #3). Mismos datos y la misma verificación que la página;
 * la página sigue viva para quien llega por un enlace.
 */
export function DetalleDelPagoEnCajon({
  paymentId,
  onCerrar,
}: {
  paymentId: string | null
  onCerrar: () => void
}) {
  return (
    <Cajon abierto={paymentId !== null} onOpenChange={(v) => !v && onCerrar()} data-testid="pago-cajon">
      {paymentId ? <ContenidoDelCajon key={paymentId} paymentId={paymentId} /> : null}
    </Cajon>
  )
}

function ContenidoDelCajon({ paymentId }: { paymentId: string }) {
  const { data, isLoading, verifyPayment, isVerifying, falloDeVerificacion, limpiarFalloDeVerificacion } =
    usePaymentDetail({ paymentId })

  useEffect(() => {
    if (!falloDeVerificacion) return
    toast.error(
      mensajeParaLaPersona(falloDeVerificacion, {
        porDefecto: 'No pudimos verificar el pago.',
        accion: 'verificar el pago',
      }),
    )
    limpiarFalloDeVerificacion()
  }, [falloDeVerificacion, limpiarFalloDeVerificacion])

  if (isLoading || !data) {
    return (
      <>
        <CajonCabecera titulo="Detalle de pago" />
        <CajonCuerpo>
          <CrossFade swapKey={isLoading ? 'cargando' : 'no-disponible'}>
            {isLoading ? (
              <div className="space-y-4" aria-hidden="true">
                <span className="block h-9 w-48 animate-pulse rounded bg-surface-muted" />
                <span className="block h-24 w-full animate-pulse rounded bg-surface-muted" />
              </div>
            ) : (
              <p className="text-body-sm text-fg-muted" data-testid="pago-cajon-no-disponible">
                No encontramos el detalle de este pago. Puede que aún no esté disponible.
              </p>
            )}
          </CrossFade>
        </CajonCuerpo>
      </>
    )
  }

  const isVerifiable = data.status === 'self_reported'
  return (
    <>
      <CajonCabecera
        titulo="Detalle de pago"
        descripcion={
          isVerifiable
            ? 'El inquilino dice que ya pagó: revisa el comprobante y verifícalo.'
            : 'El monto, su estado y quién lo verificó.'
        }
      />
      <CajonCuerpo className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CifraHeroe rotulo="Monto" cifra={formatCop(data.amount)} tamano="mediana" data-testid="pago-cajon-monto" />
          <StatusBadge tone={statusTone(data.status)}>{statusLabel(data.status, data.paymentMethod)}</StatusBadge>
        </div>
        <CamposDelPago data={data} />
      </CajonCuerpo>
      <CajonPie
        izquierda={
          <Link
            href={`${BACK_HREF}/${paymentId}`}
            className="text-body-sm text-fg underline underline-offset-2"
            data-testid="pago-cajon-abrir-pagina"
          >
            Abrir en su página
          </Link>
        }
      >
        {isVerifiable ? (
          <Button
            size="sm"
            hideArrow
            onClick={() => void verifyPayment('approve')}
            isLoading={isVerifying}
            disabled={isVerifying}
            data-testid="pago-cajon-verify-btn"
          >
            Verificar pago
          </Button>
        ) : null}
      </CajonPie>
    </>
  )
}
