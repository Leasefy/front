'use client'

/**
 * La espera del paso 2 después de pagar: validar la identidad por WhatsApp.
 *
 * Nico, 2026-09-15 (acordado con Fianly: la validación va por WhatsApp).
 * Fianly le manda a la persona un WhatsApp con los pasos. Esta pantalla:
 * - dice qué hacer y que vuelva acá cuando termine;
 * - «Ya la validé» le pregunta a Fianly EN ESE MOMENTO (back → micro). Si ya
 *   está, sigue sola hacia la respuesta; si no, dice que no la vemos, manda a
 *   WhatsApp y ofrece reenviarla;
 * - «Reenviar la validación», para quien no la vio, no le llegó o la perdió;
 * - avisa que si cierra no pierde nada: le recordamos por correo dónde quedó.
 *
 * La usan la espera del pago (`EstadoPagoAprobacion`) y «Mi aprobación»
 * (`/inquilino/aprobacion`), así quien cierra y vuelve encuentra lo mismo.
 *
 * `evaluationStatus` es el de la evaluación del micro: `awaiting_authorization`
 * = el WhatsApp salió y esperamos; cualquier otro (`started`, o sin evaluación
 * todavía) = el WhatsApp aún no sale.
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowsClockwise, Bell, CheckCircle, WarningCircle, WhatsappLogo } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui'
import {
  reenviarValidacion,
  verificarValidacion,
  ValidacionError,
  type EstadoDeLaValidacion,
} from '@/lib/api/validacion-del-estudio.service'

/** Mientras el WhatsApp sale o el estudio corre, se pregunta seguido: son minutos, no horas. */
const REFRESCO_SEGUIDO_MS = 15_000
/** Igual que el back: un reenvío cada dos minutos. */
const ESPERA_ENTRE_REENVIOS_MS = 120_000

const PASOS = [
  {
    titulo: 'Abre el WhatsApp de Fianly',
    detalle: 'Fianly es nuestro aliado para respaldar tu arriendo. El mensaje llega al celular que registraste.',
  },
  {
    titulo: 'Sigue los pasos para validar tu identidad',
    detalle: 'Toma un par de minutos y lo haces desde el celular.',
  },
  {
    titulo: 'Vuelve aquí y toca «Ya la validé»',
    detalle: 'Revisamos con Fianly y seguimos con tu respuesta.',
  },
]

export interface ValidacionPorWhatsappProps {
  /** Estado de la evaluación del micro (`awaiting_authorization`, `started`, …). */
  evaluationStatus: string | null
  /** Vuelve a leer el estudio: el padre decide qué pantalla toca después. */
  onActualizar: () => void
  /** Llega directo desde el pago: muestra «Pago confirmado» arriba. */
  pagoConfirmado?: boolean
}

export function ValidacionPorWhatsapp({
  evaluationStatus,
  onActualizar,
  pagoConfirmado = false,
}: ValidacionPorWhatsappProps) {
  const [resultado, setResultado] = useState<EstadoDeLaValidacion | null>(null)
  const [revisando, setRevisando] = useState(false)
  const [errorAlRevisar, setErrorAlRevisar] = useState<string | null>(null)
  const [reenviando, setReenviando] = useState(false)
  const [reenvio, setReenvio] = useState<{ ok: true } | { ok: false; mensaje: string } | null>(null)
  const [reenvioReciente, setReenvioReciente] = useState(false)

  // El padre entrega una función nueva en cada render: el intervalo lee la última.
  const actualizarRef = useRef(onActualizar)
  actualizarRef.current = onActualizar

  const preparando = evaluationStatus !== 'awaiting_authorization' && resultado !== 'pendiente'
  const refrescarSeguido = preparando || resultado === 'validada'

  useEffect(() => {
    if (!refrescarSeguido) return
    const id = window.setInterval(() => actualizarRef.current(), REFRESCO_SEGUIDO_MS)
    return () => window.clearInterval(id)
  }, [refrescarSeguido])

  useEffect(() => {
    if (!reenvioReciente) return
    const id = window.setTimeout(() => setReenvioReciente(false), ESPERA_ENTRE_REENVIOS_MS)
    return () => window.clearTimeout(id)
  }, [reenvioReciente])

  async function yaLaValide() {
    setRevisando(true)
    setErrorAlRevisar(null)
    setReenvio(null)
    try {
      const estado = await verificarValidacion()
      setResultado(estado)
      if (estado === 'lista' || estado === 'cerrada') actualizarRef.current()
    } catch (err) {
      setErrorAlRevisar(
        err instanceof ValidacionError
          ? err.message
          : 'No pudimos revisar tu validación. Intenta de nuevo en un momento.',
      )
    } finally {
      setRevisando(false)
    }
  }

  async function reenviar() {
    setReenviando(true)
    setReenvio(null)
    try {
      await reenviarValidacion()
      setReenvio({ ok: true })
      setReenvioReciente(true)
    } catch (err) {
      setReenvio({
        ok: false,
        mensaje:
          err instanceof ValidacionError
            ? err.message
            : 'No pudimos reenviar tu validación. Intenta de nuevo en unos minutos.',
      })
    } finally {
      setReenviando(false)
    }
  }

  if (resultado === 'validada') {
    return (
      <div data-testid="validacion-recibida" className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle weight="fill" className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-2xl font-semibold text-fg text-balance">¡Recibimos tu validación!</h2>
        <p className="max-w-md text-sm text-fg-muted">
          Estamos consultando a las aseguradoras. Tu respuesta llega en unos minutos y esta pantalla se actualiza
          sola.
        </p>
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    )
  }

  return (
    <div data-testid="validacion-whatsapp" className="flex flex-col gap-6">
      {pagoConfirmado && (
        <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-success/10 px-3 py-1 text-caption font-medium text-success">
          <CheckCircle weight="fill" className="h-4 w-4" aria-hidden="true" />
          Pago confirmado
        </p>
      )}

      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <WhatsappLogo weight="fill" className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-semibold leading-tight text-fg text-balance">
            {preparando ? 'Estamos preparando tu validación' : 'Valida tu identidad por WhatsApp'}
          </h2>
          <p className="text-sm text-fg-muted">
            {preparando
              ? 'En unos minutos te llega un WhatsApp de Fianly con los pasos para validar tu identidad. Esta pantalla se actualiza sola.'
              : 'Para consultar a las aseguradoras necesitamos confirmar que eres tú. Te enviamos un WhatsApp de Fianly con los pasos.'}
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-4 rounded-xl border border-border bg-surface-muted p-4 md:p-5">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-sm font-semibold text-primary ring-1 ring-border">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-fg">{paso.titulo}</p>
              <p className="text-caption text-fg-muted">{paso.detalle}</p>
            </div>
          </li>
        ))}
      </ol>

      {resultado === 'pendiente' && (
        <div
          data-testid="validacion-pendiente"
          role="status"
          className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4"
        >
          <WarningCircle weight="fill" className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-fg">Todavía no vemos tu validación</p>
            <p className="text-sm text-fg-muted">
              Abre WhatsApp y termina los pasos que te envió Fianly. Si no te llegó o se te perdió el mensaje, te lo
              enviamos de nuevo.
            </p>
          </div>
        </div>
      )}

      {errorAlRevisar && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {errorAlRevisar}
        </p>
      )}
      {reenvio?.ok && (
        <p role="status" className="text-sm text-success">
          Te enviamos la validación de nuevo. Revisa tu WhatsApp en unos minutos.
        </p>
      )}
      {reenvio && !reenvio.ok && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {reenvio.mensaje}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          data-testid="reenviar-validacion"
          type="button"
          variant={resultado === 'pendiente' ? 'secondary' : 'ghost'}
          hideArrow
          onClick={reenviar}
          isLoading={reenviando}
          disabled={reenviando || reenvioReciente || preparando}
        >
          <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
          {reenvioReciente ? 'Validación reenviada' : 'Reenviar la validación'}
        </Button>
        <Button
          data-testid="ya-la-valide"
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={yaLaValide}
          isLoading={revisando}
          disabled={revisando || preparando}
        >
          {revisando ? 'Revisando con Fianly…' : 'Ya la validé, continuar'}
        </Button>
      </div>

      <p className="flex items-start gap-2 border-t border-border pt-4 text-caption text-fg-muted">
        <Bell className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Si cierras esta página no pierdes nada: te recordamos por correo dónde quedaste y puedes volver cuando quieras
        desde «Mi aprobación».
      </p>
    </div>
  )
}

export default ValidacionPorWhatsapp
