'use client'

/**
 * RecorridoHilo — la tira que se monta arriba de una pantalla que ya existe
 * para decir en qué paso del recorrido está parada y qué sigue.
 *
 * Es la mitad "aditiva" del rediseño: no mueve ni renombra nada. Las pantallas
 * de los pasos 8, 9, 10 y 11 viven en tres secciones distintas del sidebar
 * (Comercial, Comercial anidado, Administración) y hoy nada las conecta. Esta
 * tira es el hilo.
 *
 * Lo que resuelve, en una línea: *de quién es la pelota*. Un "paso 4 de 11" sin
 * eso no le sirve a nadie — no distingue esperar de tener que actuar.
 *
 * Ver `src/lib/recorrido/pasos.ts` para la definición de los 11 pasos.
 */

import Link from 'next/link'
import { ArrowRight, User, HandPointing } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  PASOS_RECORRIDO,
  TOTAL_PASOS,
  pasoPorKey,
  type PasoKey,
} from '@/lib/recorrido/pasos'

export interface RecorridoHiloProps {
  /** El paso en el que está parada la pantalla que monta esta tira. */
  paso: PasoKey
  /**
   * Rutas de los pasos que dependen del contexto de la pantalla — comparar y
   * decidir cuelgan de `/propiedades/[id]/candidatos`, así que la ruta real
   * solo la conoce quien tiene el `id` a mano.
   */
  hrefs?: Partial<Record<PasoKey, string>>
  className?: string
}

export function RecorridoHilo({ paso, hrefs, className }: RecorridoHiloProps) {
  const { t } = useI18n()

  const actual = pasoPorKey(paso)
  // Una clave desconocida no debe tumbar la pantalla que hospeda la tira.
  if (!actual) return null

  // `numero` es 1-based, así que sirve directo como índice del siguiente.
  const siguiente = PASOS_RECORRIDO[actual.numero]
  const hrefSiguiente = siguiente ? hrefs?.[siguiente.key] ?? siguiente.href : null
  const meToca = actual.actor === 'inmobiliaria'

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-muted px-4 py-3',
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {/* Progreso: 11 segmentos. Decorativo — el texto de abajo lleva el significado. */}
        <div className="flex items-center gap-1" aria-hidden="true">
          {PASOS_RECORRIDO.map((p) => (
            <span
              key={p.key}
              className={cn(
                'h-1 w-4 rounded-full transition-colors',
                p.numero < actual.numero && 'bg-primary/40',
                p.numero === actual.numero && 'bg-primary',
                p.numero > actual.numero && 'bg-border',
              )}
            />
          ))}
        </div>

        <p className="text-sm text-fg">
          <span className="font-mono tabular-nums text-fg-muted">
            {t('inmobiliaria.recorrido.pasoDe', { n: actual.numero, total: TOTAL_PASOS })}
          </span>
          <span className="mx-2 text-fg-subtle" aria-hidden="true">
            ·
          </span>
          <span className="font-medium">{t(actual.labelKey)}</span>
        </p>

        {/* Color + icono + texto: el estado nunca se comunica solo con color. */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
            meToca ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-fg-muted',
          )}
        >
          {meToca ? (
            <HandPointing className="h-3.5 w-3.5" weight="fill" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          {meToca
            ? t('inmobiliaria.recorrido.teToca')
            : t('inmobiliaria.recorrido.esperandoAlInquilino')}
        </span>
      </div>

      {siguiente && (
        <div className="shrink-0 text-sm">
          <span className="text-fg-muted">{t('inmobiliaria.recorrido.sigue')}: </span>
          {hrefSiguiente ? (
            <Link
              href={hrefSiguiente}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {t(siguiente.labelKey)}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="font-medium text-fg">{t(siguiente.labelKey)}</span>
          )}
        </div>
      )}
    </div>
  )
}
