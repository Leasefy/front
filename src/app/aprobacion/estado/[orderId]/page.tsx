'use client'

/**
 * /aprobacion/estado/[orderId] — pantalla de cierre del estudio.
 *
 * El segmento se llama `orderId` (Slice 1 rework): es el `orderId` que
 * devolvió `POST /pre-scoring` al crear la orden, no un `solicitudId` — ese
 * concepto ya no existe en el contrato firme del back principal.
 *
 * A esta pantalla llega la vuelta de Wompi (`?status=` en la URL). NO dispara
 * el pre-scoring ni hace polling: eso lo hace el backend en el webhook de
 * Wompi, que a su vez le pide a Fianly que mande el correo. Acá solo se dice
 * qué pasó con el pago:
 *
 * - Pago recibido (APPROVED/PENDING, o visita directa sin `?status=`): pedir
 *   revisar el correo — el estudio queda esperando 48h a que la persona lo
 *   complete por ese medio.
 * - Pago no completado (DECLINED/VOIDED/ERROR): invitar a reintentar.
 */

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { EnvelopeSimple, X, XCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { LeasefyLogotype } from '@/components/brand'
import { useAuth } from '@/lib/auth/use-auth'
import { getUserHomeRoute } from '@/lib/auth/role-routes'

const ESTADOS_PAGO_FALLIDO = new Set(['DECLINED', 'VOIDED', 'ERROR'])

export default function AprobacionEstadoPage() {
  const params = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const status = (searchParams.get('status') ?? '').toUpperCase()
  const pagoFallido = ESTADOS_PAGO_FALLIDO.has(status)
  void params

  function cerrar() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(user ? getUserHomeRoute(user) : '/propiedades')
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
          <BrandHomeLink aria-label="Leasefy — inicio" className="text-fg">
            <LeasefyLogotype size={24} />
          </BrandHomeLink>
          <Button variant="outline" size="sm" onClick={cerrar} hideArrow>
            <X className="h-4 w-4" aria-hidden="true" />
            Cerrar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="pt-6 space-y-5">
            {pagoFallido ? <PagoNoCompletado /> : <RevisaTuCorreo />}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function RevisaTuCorreo() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-11 h-11 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
        <EnvelopeSimple className="w-6 h-6 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-fg leading-tight">Revisa tu correo</h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">
          Recibimos tu pago. Te enviamos un correo para autorizar y completar tu estudio. Tienes
          48 horas; si no la completas, se pierde el pago.
        </p>
      </div>
    </div>
  )
}

function PagoNoCompletado() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-md bg-danger-soft flex items-center justify-center shrink-0">
          <XCircle className="w-6 h-6 text-danger" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-fg leading-tight">El pago no se completó.</h1>
          <p className="text-sm text-fg-muted mt-1 leading-relaxed">
            No alcanzamos a procesar tu pago. Puedes volver a intentarlo cuando quieras.
          </p>
        </div>
      </div>
      <Button asChild className="w-full">
        <Link href="/aprobacion">Volver a intentar</Link>
      </Button>
    </div>
  )
}
