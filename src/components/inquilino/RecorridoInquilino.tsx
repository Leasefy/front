'use client'

/**
 * RecorridoInquilino — la cabecera de una pantalla que es un paso del recorrido.
 *
 * Resuelve tres preguntas que la pantalla de pago no contestaba: **de dónde
 * vengo, dónde estoy y qué sigue**.
 *
 * El "volver" es el **paso anterior**, no `router.back()`. Parece lo mismo y no
 * lo es: a estas pantallas se puede llegar desde un correo o escribiendo la
 * URL, y ahí el historial está vacío — el botón no haría nada. Un destino
 * declarado siempre funciona.
 *
 * El número sale de `pasos-inquilino.ts`, que son 7 y no 11: los 11 son el mapa
 * de la inmobiliaria y cinco de esos pasos no son trabajo del inquilino.
 */

import Link from 'next/link'
import { ArrowLeft, ArrowRight, HandPointing, Hourglass } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import {
  PASOS_INQUILINO,
  TOTAL_PASOS_INQUILINO,
  pasoInquilinoPorKey,
  siguientePasoInquilino,
  anteriorPasoInquilino,
  type PasoInquilinoKey,
  type Turno,
} from '@/lib/recorrido/pasos-inquilino'

/** Cómo se nombra cada turno. El color nunca comunica solo: hay icono y texto. */
const TURNO: Record<Turno, { texto: string; icono: typeof HandPointing; clase: string }> = {
  tuyo: { texto: 'Te toca a ti', icono: HandPointing, clase: 'bg-primary-soft text-primary' },
  nuestro: { texto: 'Lo hacemos nosotros', icono: Hourglass, clase: 'bg-surface-muted text-fg-muted' },
  inmobiliaria: {
    texto: 'Esperas a la inmobiliaria',
    icono: Hourglass,
    clase: 'bg-surface-muted text-fg-muted',
  },
}

export interface RecorridoInquilinoProps {
  /** El paso en el que está parada la pantalla. */
  paso: PasoInquilinoKey
  /** Título de la pantalla. Va acá para que el h1 y el paso sean una unidad. */
  titulo: string
  descripcion?: string
  /**
   * Pisa el turno declarado en la tabla, para cuando la pantalla sabe algo que
   * la tabla no puede saber.
   *
   * El caso real: el paso 3 es "tuyo" —pagar—, pero si el cobro todavía no
   * existe del lado del servidor no le toca a nadie más que a nosotros. Decirle
   * "te toca a ti" a alguien que no tiene ningún botón que apretar es la misma
   * clase de mentira que un "reintentar" sobre un 404.
   */
  turno?: Turno
  className?: string
}

export function RecorridoInquilino({
  paso,
  titulo,
  descripcion,
  turno: turnoForzado,
  className,
}: RecorridoInquilinoProps) {
  const actual = pasoInquilinoPorKey(paso)
  // Una clave desconocida no debe tumbar la pantalla que hospeda la cabecera.
  if (!actual) return null

  const anterior = anteriorPasoInquilino(paso)
  const siguiente = siguientePasoInquilino(paso)
  const turnoActual = turnoForzado ?? actual.turno
  const turno = TURNO[turnoActual]
  const IconoTurno = turno.icono

  return (
    <header className={cn('space-y-4', className)}>
      {/* De dónde vengo. Primero, porque es lo que se busca cuando uno se
          quiere ir — y porque a esta pantalla se puede llegar sin historial. */}
      {anterior && (
        <Link
          href={anterior.href}
          className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted transition-colors hover:text-fg"
          data-testid="recorrido-volver"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {anterior.label}
        </Link>
      )}

      <div className="space-y-2">
        {/* Dónde estoy: la barra dice cuánto falta, el texto dice qué es. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1" aria-hidden="true">
            {PASOS_INQUILINO.map((p) => (
              <span
                key={p.key}
                className={cn(
                  'h-1 w-5 rounded-full transition-colors',
                  p.numero < actual.numero && 'bg-primary/40',
                  p.numero === actual.numero && 'bg-primary',
                  p.numero > actual.numero && 'bg-border',
                )}
              />
            ))}
          </div>
          <span className="font-mono text-caption uppercase tracking-wide tabular-nums text-fg-muted">
            Paso {actual.numero} de {TOTAL_PASOS_INQUILINO}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium',
              turno.clase,
            )}
          >
            <IconoTurno
              className="h-3.5 w-3.5"
              weight={turnoActual === 'tuyo' ? 'fill' : 'regular'}
              aria-hidden="true"
            />
            {turno.texto}
          </span>
        </div>

        <h1 className="text-h1 font-semibold tracking-tight text-fg">{titulo}</h1>
        {descripcion && <p className="text-body text-fg-muted">{descripcion}</p>}
      </div>

      {/* Qué sigue. Sin link: todavía no puede ir — es el resultado de esta
          pantalla, no un lugar al que saltarse. */}
      {siguiente && (
        <p className="flex items-center gap-1.5 text-body-sm text-fg-subtle">
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Después: <span className="text-fg-muted">{siguiente.label}</span>
            {' — '}
            {siguiente.desc}
          </span>
        </p>
      )}
    </header>
  )
}
