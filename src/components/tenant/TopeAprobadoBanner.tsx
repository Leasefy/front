'use client'

/**
 * El tope aprobado, siempre a la vista.
 *
 * Es el dato que convierte el catálogo en algo personal: deja de ser una
 * vitrina y pasa a ser "lo que puedo tomar". Por eso vive arriba del listado y
 * no escondido en un perfil.
 *
 * Regla que no se rompe: lo que se pasa del tope **se ve**, marcado y con el
 * motivo. Esconderlo se siente a trampa; mostrarlo bloqueado se siente a
 * diagnóstico — y fue explícito en la reunión que poder navegar importa.
 */

import Link from 'next/link'
import { Hourglass, SealCheck } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useTf } from '@/lib/i18n/use-tf'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  diasParaVencer,
  estadoVigencia,
  referenciaCanon,
  type Aprobacion,
  type EstadoVigencia,
  type Referencia,
} from '@/lib/api/aprobacion.service'

const NS = 'inquilino.tope'

export function TopeAprobadoBanner({
  aprobacion,
  vigente,
  className,
  detalle = { href: '/inquilino/aprobacion', label: 'Ver detalle' },
}: {
  aprobacion: Aprobacion | null
  vigente: boolean
  className?: string
  /**
   * A dónde lleva el botón de la derecha.
   *
   * El default asume sesión. Quien llega por el link del asesor **no la tiene**,
   * y `/inquilino/aprobacion` lo mandaría al login — justo después de haberse
   * aprobado. En ese caso lo útil es otra cosa: su aprobación vive solo en este
   * navegador, así que lo que necesita es una cuenta donde guardarla.
   *
   * `variant` existe porque el peso del botón depende de dónde esté la banda:
   * dentro del catálogo "Ver detalle" es secundario —ya está donde importa—,
   * pero en el home ir a su catálogo ES la acción, y un botón apagado al lado
   * del número no incentiva nada.
   */
  detalle?: { href: string; label: string; variant?: 'default' | 'secondary' }
}) {
  const tf = useTf()

  /*
   * En proceso: no invita ni regaña, informa. Mandarlo a "Conoce tu tope"
   * cuando ya lo pidió lo haría empezar de nuevo algo que ya está corriendo.
   */
  if (aprobacion?.estado === 'en_proceso') {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-surface p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
          className,
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-surface-muted flex items-center justify-center shrink-0">
            <Hourglass className="w-5 h-5 text-fg-muted" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">
              {tf(`${NS}.proceso.titulo`, 'Estamos consultando a las aseguradoras')}
            </p>
            <p className="text-sm text-fg-muted mt-0.5">
              {tf(`${NS}.proceso.texto`, 'Te avisamos apenas sepamos hasta cuánto podemos respaldarte.')}
            </p>
          </div>
        </div>
        <Button asChild variant="secondary" hideArrow className="shrink-0">
          <Link href="/inquilino/aprobacion">{tf(`${NS}.cta.verEstado`, 'Ver estado')}</Link>
        </Button>
      </div>
    )
  }

  /*
   * Rechazado: la salida no es "consultá otra vez" —eso es pedirle que repita
   * lo que acaba de fallar— sino la pantalla que explica qué puede hacer
   * (mejorar perfil, esperar, o que alguien se postule por él).
   */
  if (aprobacion?.estado === 'rechazado') {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-surface p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
          className,
        )}
      >
        <div>
          <p className="text-sm font-medium text-fg">
            {tf(`${NS}.rechazado.titulo`, 'Por ahora no podemos aprobarte')}
          </p>
          <p className="text-sm text-fg-muted mt-0.5">
            {tf(`${NS}.rechazado.texto`, 'No es un no definitivo. Hay caminos para seguir adelante.')}
          </p>
        </div>
        <Button asChild variant="secondary" hideArrow className="shrink-0">
          <Link href="/inquilino/aprobacion">
            {tf(`${NS}.cta.queHacer`, 'Ver qué puedes hacer')}
          </Link>
        </Button>
      </div>
    )
  }

  // Sin aprobación: la banda invita, no regaña.
  if (!aprobacion || !vigente) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-surface p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
          className,
        )}
      >
        <div>
          <p className="text-sm font-medium text-fg">
            {aprobacion?.estado === 'aprobado'
              ? tf(`${NS}.vencida`, 'Tu aprobación venció')
              : tf(`${NS}.sinTope`, 'Todavía no sabes hasta cuánto puedes arrendar')}
          </p>
          <p className="text-sm text-fg-muted mt-0.5">
            {tf(`${NS}.invita`, 'Con tu aprobación te mostramos solo las propiedades que van contigo.')}
          </p>
        </div>
        <Button asChild className="shrink-0">
          {/* El Button ya trae su propia flecha. */}
          <Link href="/aprobacion">
            {aprobacion?.estado === 'aprobado'
              ? tf(`${NS}.cta.renovar`, 'Renovar')
              : tf(`${NS}.cta.conocer`, 'Conoce tu tope')}
          </Link>
        </Button>
      </div>
    )
  }

  const dias = diasParaVencer(aprobacion.vigenteHasta)
  const vig: EstadoVigencia | null = estadoVigencia(dias)
  const ref: Referencia | null = referenciaCanon(aprobacion)

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center shrink-0">
          <SealCheck className="w-5 h-5 text-success" weight="fill" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          {/* El encabezado depende de qué número tenemos. Un tope es un techo
              ("hasta"); un canon consultado es solo un punto confirmado
              ("para"). Decir "hasta" con el segundo le pondría a la persona un
              límite que ninguna aseguradora calculó. */}
          <p className="text-sm text-fg-muted">
            {ref?.tipo === 'tope'
              ? tf(`${NS}.aprobadoHasta`, 'Estás aprobado hasta')
              : tf(`${NS}.aprobadoPara`, 'Estás aprobado para')}
          </p>
          {ref ? (
            <p className="font-mono tabular-nums text-xl font-semibold text-fg leading-tight">
              {formatCurrency(ref.valorCop)}
              <span className="text-sm font-sans font-normal text-fg-muted"> {tf(`${NS}.porMes`, '/mes')}</span>
            </p>
          ) : (
            /* Aprobado sin número: se dice, no se inventa. */
            <p className="text-sm text-fg">{tf(`${NS}.calculando`, 'Estamos calculando tu tope')}</p>
          )}
          {aprobacion.condicionada && (
            <p className="text-xs text-warning mt-0.5">
              {tf(`${NS}.condicionada`, 'Con condiciones por resolver')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {dias !== null && vig && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              vig === 'vigente' && 'bg-surface-muted text-fg-muted',
              vig === 'por_vencer' && 'bg-warning-soft text-warning',
              vig === 'vencida' && 'bg-danger-soft text-danger',
            )}
          >
            <Hourglass className="w-3.5 h-3.5" aria-hidden="true" />
            {dias > 1
              ? `${tf(`${NS}.venceEn`, 'Vence en')} ${dias} ${tf(`${NS}.dias`, 'días')}`
              : dias === 1
                ? tf(`${NS}.venceManana`, 'Vence mañana')
                : tf(`${NS}.venceHoy`, 'Vence hoy')}
          </span>
        )}
        <Button
          asChild
          variant={detalle.variant ?? 'secondary'}
          hideArrow={(detalle.variant ?? 'secondary') === 'secondary'}
        >
          <Link href={detalle.href}>{detalle.label}</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Marca sobre una tarjeta cuyo canon se pasa de la referencia.
 * No la esconde ni la deshabilita: la explica.
 *
 * El texto cambia según de dónde salga el número, y no es un detalle: sobre un
 * **tope** la propiedad está fuera de alcance, pero sobre un **canon
 * consultado** solo está sin confirmar todavía — y eso se resuelve preguntando,
 * no descartándola.
 */
export function SobreTopeOverlay({ referencia }: { referencia: Referencia | null }) {
  const tf = useTf()
  const esTope = referencia?.tipo === 'tope'

  return (
    // Superficie sólida, sin `backdrop-blur`: el glass morphism sobre contenido
    // está prohibido en Cadence (DESIGN.md §1 y §9). La marca se lee igual.
    <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-lg border-t border-border bg-surface-muted px-3 py-2">
      <p className="text-xs font-medium text-fg">
        {esTope
          ? tf(`${NS}.overlay.sobreTope`, 'Por encima de tu tope')
          : tf(`${NS}.overlay.sobreConsultado`, 'Por encima de lo que consultaste')}
      </p>
      {referencia && (
        <p className="text-xs text-fg-muted">
          {esTope ? tf(`${NS}.aprobadoHasta`, 'Estás aprobado hasta') + ' ' : tf(`${NS}.overlay.consultaste`, 'Consultaste') + ' '}
          <span className="font-mono tabular-nums">{formatCurrency(referencia.valorCop)}</span>
          {!esTope && ` — ${tf(`${NS}.overlay.asesorRevisa`, 'un asesor puede revisarlo')}`}
        </p>
      )}
    </div>
  )
}
