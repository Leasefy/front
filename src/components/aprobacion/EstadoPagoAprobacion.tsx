'use client'

/**
 * EstadoPagoAprobacion — pantalla de estado que reemplaza al formulario de
 * `/aprobacion` en cuanto se abre el pago en Wompi (en otra pestaña).
 *
 * La página NO navega a Wompi: abre el checkout hosteado en una pestaña
 * aparte y esta pantalla poleaa el back con `usePreScoringCurrent` (mismo
 * hook que consume `/inquilino/aprobacion`, `GET /pre-scoring/current`) hasta
 * que la orden avanza. Mismo patrón que `useAgencyCheckout` +
 * `AgencyCheckoutOverlay` para el checkout de planes de agencia — acá no hace
 * falta un modal porque la página ya no tiene nada más que mostrar mientras
 * se espera.
 *
 * `estado` sale siempre de `mapEstadoPreScoring` (vía el hook): nunca se
 * recalcula acá. Los casos `aprobado`/`rechazado` no duplican el resultado
 * completo — eso vive en `/inquilino/aprobacion` — solo avisan que ya está
 * listo y llevan para allá.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  WarningCircle,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui'
import { usePreScoringCurrent } from '@/lib/hooks/use-prescoring-current'

export interface EstadoPagoAprobacionProps {
  /** Link de pago hosteado por Wompi, para el link manual y el botón de reabrir. */
  paymentUrl: string | null
  /** El pre-open de la pestaña falló (bloqueado por el navegador): cambia el copy del link. */
  popupBlocked: boolean
  /** Volver al formulario (expirado/error). */
  onReintentar: () => void
}

export function EstadoPagoAprobacion({
  paymentUrl,
  popupBlocked,
  onReintentar,
}: EstadoPagoAprobacionProps) {
  const { estado, isLoading, refetch } = usePreScoringCurrent()

  // El hook ya polea solo, pero al volver de la pestaña de Wompi conviene
  // revalidar de inmediato en vez de esperar el próximo tick del intervalo.
  useEffect(() => {
    window.addEventListener('focus', refetch)
    return () => window.removeEventListener('focus', refetch)
  }, [refetch])

  if (estado === 'expirado') {
    return (
      <Estado
        icon={<Clock className="w-6 h-6 text-warning" aria-hidden="true" />}
        tono="warning"
        titulo="La ventana para pagar venció"
        descripcion="Pasó el tiempo para completar el pago. Puedes volver a intentarlo cuando quieras."
      >
        <Button onClick={onReintentar} className="w-full">
          Volver a intentar
        </Button>
      </Estado>
    )
  }

  if (estado === 'error') {
    return (
      <Estado
        icon={<WarningCircle className="w-6 h-6 text-danger" aria-hidden="true" />}
        tono="danger"
        titulo="Hubo un error"
        descripcion="No pudimos confirmar tu pago. Puedes volver a intentarlo o escribirnos si el problema sigue."
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onReintentar}>Volver a intentar</Button>
          <Button asChild variant="secondary">
            <a href="mailto:soporte@leasefy.com">Contactar soporte</a>
          </Button>
        </div>
      </Estado>
    )
  }

  if (estado === 'aprobado' || estado === 'rechazado') {
    return (
      <Estado
        icon={<CheckCircle className="w-6 h-6 text-success" weight="fill" aria-hidden="true" />}
        tono="success"
        titulo="¡Tu estudio está listo!"
        descripcion="Ya tenemos el resultado de tu aprobación."
      >
        <Button asChild className="w-full">
          <Link href="/inquilino/aprobacion">Ver mi aprobación</Link>
        </Button>
      </Estado>
    )
  }

  if (estado === 'en_proceso') {
    return (
      <Estado
        icon={<EnvelopeSimple className="w-6 h-6 text-primary" aria-hidden="true" />}
        tono="primary"
        titulo="Pago confirmado"
        descripcion="Te enviamos un correo para autorizar y completar tu estudio — tenés 48 horas."
      >
        <Button asChild className="w-full">
          <Link href="/inquilino/aprobacion">Ver mi aprobación</Link>
        </Button>
      </Estado>
    )
  }

  // sin_estudio: todavía no hay señal del pago (orden recién creada,
  // PENDING_PAYMENT, o el back todavía no la procesó). Es el estado por
  // defecto apenas se abre la pestaña de pago.
  return (
    <div className="flex flex-col items-center text-center gap-3 py-4">
      <Spinner size="lg" variant="current" className="text-primary" />
      <h1 className="text-lg font-semibold text-fg leading-tight">
        Esperando la confirmación de tu pago…
      </h1>
      <p className="text-sm text-fg-muted leading-relaxed max-w-sm">
        {isLoading
          ? 'Un momento, estamos consultando el estado de tu pago.'
          : 'Completa el pago en la pestaña que abrimos. Esta pantalla se actualiza sola.'}
      </p>
      {paymentUrl && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2"
        >
          <ArrowSquareOut className="w-3.5 h-3.5" aria-hidden="true" />
          {popupBlocked
            ? 'No se abrió la pestaña — abrí el pago acá'
            : '¿No ves la pestaña? Abrila de nuevo'}
        </a>
      )}
      <Button variant="ghost" size="sm" hideArrow onClick={() => refetch()} className="mt-1">
        Ya pagué — verificar
      </Button>
    </div>
  )
}

/** Anatomía compartida por los estados terminales: ícono + título + descripción + acción. */
function Estado({
  icon,
  tono,
  titulo,
  descripcion,
  children,
}: {
  icon: React.ReactNode
  tono: 'warning' | 'danger' | 'success' | 'primary'
  titulo: string
  descripcion: string
  children: React.ReactNode
}) {
  const fondoTono: Record<typeof tono, string> = {
    warning: 'bg-warning-soft',
    danger: 'bg-danger-soft',
    success: 'bg-success-soft',
    primary: 'bg-primary-soft',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-md ${fondoTono[tono]} flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-fg leading-tight">{titulo}</h1>
          <p className="text-sm text-fg-muted mt-1 leading-relaxed">{descripcion}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default EstadoPagoAprobacion
