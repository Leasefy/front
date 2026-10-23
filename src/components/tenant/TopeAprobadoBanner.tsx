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

import type React from 'react'
import Link from 'next/link'
import { Hourglass, SealCheck, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
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
  tamano = 'banda',
}: {
  aprobacion: Aprobacion | null
  vigente: boolean
  className?: string
  /**
   * `banda` (la de siempre: catálogo, marketplace, la ficha) o `heroe`: el inicio de quien busca, donde el
   * tope ES la respuesta de la pantalla («hasta cuánto puedo arrendar») y va grande, con su rótulo en mono.
   * Los textos, los estados y a dónde lleva cada botón son los mismos en las dos.
   */
  tamano?: 'banda' | 'heroe'
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
  const heroe = tamano === 'heroe'
  const rotulo = tf(`${NS}.heroe.rotulo`, 'Tu tope')

  /*
   * En proceso: no invita ni regaña, informa. Mandarlo a "Conoce tu tope"
   * cuando ya lo pidió lo haría empezar de nuevo algo que ya está corriendo.
   */
  if (aprobacion?.estado === 'en_proceso') {
    if (heroe)
      return (
        <TopeEnGrande
          className={className}
          rotulo={rotulo}
          titulo={tf(`${NS}.proceso.titulo`, 'Estamos consultando a las aseguradoras')}
          texto={tf(`${NS}.proceso.texto`, 'Te avisamos apenas sepamos hasta cuánto podemos respaldarte.')}
          accion={
            <Button asChild variant="secondary" size="sm" hideArrow>
              <Link href="/inquilino/aprobacion">{tf(`${NS}.cta.verEstado`, 'Ver estado')}</Link>
            </Button>
          }
        />
      )
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
   * Rechazado: la salida no es "consulta otra vez" —eso es pedirle que repita
   * lo que acaba de fallar— sino la pantalla que explica qué puede hacer
   * (mejorar perfil, esperar, o que alguien se postule por él).
   */
  if (aprobacion?.estado === 'rechazado') {
    if (heroe)
      return (
        <TopeEnGrande
          className={className}
          rotulo={rotulo}
          titulo={tf(`${NS}.rechazado.titulo`, 'Por ahora no podemos aprobarte')}
          texto={tf(`${NS}.rechazado.texto`, 'No es un no definitivo. Hay caminos para seguir adelante.')}
          accion={
            <Button asChild variant="secondary" size="sm" hideArrow>
              <Link href="/inquilino/aprobacion">{tf(`${NS}.cta.queHacer`, 'Ver qué puedes hacer')}</Link>
            </Button>
          }
        />
      )
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
    if (heroe)
      return (
        <TopeEnGrande
          className={className}
          rotulo={rotulo}
          titulo={
            aprobacion?.estado === 'aprobado'
              ? tf(`${NS}.vencida`, 'Tu aprobación venció')
              : tf(`${NS}.sinTope`, 'Todavía no sabes hasta cuánto puedes arrendar')
          }
          texto={tf(`${NS}.invita`, 'Con tu aprobación te mostramos solo los inmuebles que van contigo.')}
          accion={
            <Button asChild size="sm">
              <Link href="/aprobacion">
                {aprobacion?.estado === 'aprobado'
                  ? tf(`${NS}.cta.renovar`, 'Renovar')
                  : tf(`${NS}.cta.conocer`, 'Conoce tu tope')}
              </Link>
            </Button>
          }
        />
      )
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
            {tf(`${NS}.invita`, 'Con tu aprobación te mostramos solo los inmuebles que van contigo.')}
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

  if (heroe) {
    const vence =
      dias !== null && vig
        ? dias > 1
          ? `${tf(`${NS}.venceEn`, 'Vence en')} ${dias} ${tf(`${NS}.dias`, 'días')}`
          : dias === 1
            ? tf(`${NS}.venceManana`, 'Vence mañana')
            : tf(`${NS}.venceHoy`, 'Vence hoy')
        : null
    return (
      <section
        className={cn(
          'flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-end sm:justify-between',
          className,
        )}
        data-testid="tope-en-grande"
      >
        {ref ? (
          <CifraHeroe
            className="min-w-0"
            // Un tope es un techo («hasta»); un canon consultado es un punto confirmado («para»).
            rotulo={ref.tipo === 'tope' ? tf(`${NS}.aprobadoHasta`, 'Estás aprobado hasta') : tf(`${NS}.aprobadoPara`, 'Estás aprobado para')}
            cifra={formatCurrency(ref.valorCop)}
            contexto={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{tf(`${NS}.porMes`, '/mes')}</span>
                {vence && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 font-mono text-caption uppercase tracking-[0.08em]',
                      vig === 'vigente' && 'text-fg-muted',
                      vig === 'por_vencer' && 'text-warning',
                      vig === 'vencida' && 'text-danger',
                    )}
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                    {vence}
                  </span>
                )}
              </span>
            }
            pie={
              aprobacion.condicionada ? (
                <span className="text-warning">{tf(`${NS}.condicionada`, 'Con condiciones por resolver')}</span>
              ) : undefined
            }
          />
        ) : (
          /* Aprobado sin número: se dice, no se inventa. */
          <div className="min-w-0 space-y-1.5">
            <p className="font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle">{rotulo}</p>
            <p className="text-h3 font-light text-fg">{tf(`${NS}.calculando`, 'Estamos calculando tu tope')}</p>
          </div>
        )}
        <Button asChild size="sm" variant={detalle.variant ?? 'secondary'} hideArrow className="shrink-0 self-start sm:self-end">
          <Link href={detalle.href}>{detalle.label}</Link>
        </Button>
      </section>
    )
  }

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
            <p className="text-caption text-warning mt-0.5">
              {tf(`${NS}.condicionada`, 'Con condiciones por resolver')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {dias !== null && vig && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium',
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

/** El tope en grande cuando todavía no hay cifra: rótulo en mono, la frase como título liviano y su botón. */
function TopeEnGrande({
  rotulo,
  titulo,
  texto,
  accion,
  className,
}: {
  rotulo: string
  titulo: string
  texto: string
  accion: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
      data-testid="tope-en-grande"
    >
      <div className="min-w-0 space-y-1.5">
        <p className="font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle">{rotulo}</p>
        <h2 className="text-h3 font-light text-balance text-fg">{titulo}</h2>
        <p className="text-sm text-fg-muted">{texto}</p>
      </div>
      <div className="shrink-0">{accion}</div>
    </section>
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
      <p className="flex items-center gap-1 text-caption font-medium text-fg">
        {esTope
          ? tf(`${NS}.overlay.sobreTope`, 'Supera lo que podemos respaldarte')
          : tf(`${NS}.overlay.sobreConsultado`, 'Por encima de lo que consultaste')}
        {/* El "?" abre la salida real cuando el canon se pasa del tope: que
            otra persona tome el arriendo. Solo sobre un tope de verdad — sobre
            un canon consultado la salida es que un asesor lo revise. Es un span
            (no un button) y vive FUERA del <Link> de la tarjeta (hermano en el
            grid), así que el hover no navega. */}
        {esTope && (
          <span className="group/cod relative inline-flex items-center">
            <span
              role="img"
              aria-label={tf(
                `${NS}.overlay.codeudorAria`,
                '¿Cómo puedo postularme igual?',
              )}
              className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-warning text-[9px] font-bold leading-none text-warning"
            >
              ?
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-md border border-border bg-[hsl(var(--popover))] p-2 text-[11px] font-normal leading-snug text-[hsl(var(--popover-foreground))] opacity-0 shadow-md transition-opacity duration-fast group-hover/cod:opacity-100"
            >
              {tf(
                `${NS}.overlay.codeudorHint`,
                'Puedes postularte con el perfil de otra persona (un codeudor) para que tome el arriendo por ti.',
              )}
            </span>
          </span>
        )}
      </p>
      {referencia && (
        <p className="text-caption text-fg-muted">
          {esTope ? tf(`${NS}.aprobadoHasta`, 'Estás aprobado hasta') + ' ' : tf(`${NS}.overlay.consultaste`, 'Consultaste') + ' '}
          <span className="font-mono tabular-nums">{formatCurrency(referencia.valorCop)}</span>
          {!esTope && ` — ${tf(`${NS}.overlay.asesorRevisa`, 'un asesor puede revisarlo')}`}
        </p>
      )}
    </div>
  )
}

/**
 * Alerta prominente para la FICHA de propiedad cuando su canon supera el tope
 * aprobado. A diferencia del overlay chico de la tarjeta (`SobreTopeOverlay`),
 * acá hay espacio para explicar la salida real: postularse con el perfil de
 * otra persona (un codeudor) que sí sea apto para ese valor.
 *
 * Solo se muestra sobre un tope REAL (`tipo === 'tope'`) — sobre un canon
 * consultado la propiedad no está "fuera de alcance", solo sin confirmar, y la
 * salida es que un asesor lo revise, no un codeudor. Devuelve `null` en
 * cualquier otro caso, así el llamador la renderiza sin condicionar.
 */
export function SobreTopeAlert({
  monthlyRent,
  referencia,
  className,
}: {
  monthlyRent: number
  referencia: Referencia | null
  className?: string
}) {
  const tf = useTf()
  if (!referencia || referencia.tipo !== 'tope') return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-[hsl(var(--warning-500)/0.3)] bg-[hsl(var(--warning-50))] p-4',
        className,
      )}
    >
      <Warning className="mt-0.5 h-5 w-5 shrink-0 text-warning" weight="fill" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-warning">
          {tf(`${NS}.overlay.sobreTope`, 'Supera lo que podemos respaldarte')}
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          {tf(`${NS}.alerta.canon`, 'El canon de este inmueble')}
          {' ('}
          <span className="font-mono tabular-nums">{formatCurrency(monthlyRent)}</span>
          {tf(`${NS}.porMes`, '/mes')}
          {') '}
          {tf(`${NS}.alerta.superaTope`, 'está por encima de tu tope aprobado de')}{' '}
          <span className="font-mono tabular-nums">{formatCurrency(referencia.valorCop)}</span>
          {'. '}
          {tf(
            `${NS}.alerta.codeudor`,
            'Puedes postularte igual: la inmobiliaria decide si te la arrienda. Si quieres reforzar tu postulación, suma a otra persona (un codeudor).',
          )}
        </p>
      </div>
    </div>
  )
}
