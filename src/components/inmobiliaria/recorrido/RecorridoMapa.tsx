'use client'

/**
 * RecorridoMapa — los 11 pasos completos, en vertical, con el corte donde el
 * recorrido cambia de manos.
 *
 * Por qué no usa el `Stepper` de Cadence: el de Cadence es de solo lectura
 * (`Step` no acepta `href` ni `onClick`, ver `@leasefy/cadence` §42). Acá los
 * pasos de la inmobiliaria tienen que ser navegables — el mapa no sirve solo
 * para entender el recorrido, sirve para meterse en él. El lenguaje visual sí
 * es el mismo: círculo numerado, riel, descripción por paso.
 *
 * La línea entre el paso 6 y el 7 es lo más importante de este componente. Es
 * el momento en que la pelota pasa del inquilino a la inmobiliaria, y hoy no
 * está dibujado en ningún lado del panel.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Check } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { PASOS_RECORRIDO, type PasoKey, type PasoRecorrido } from '@/lib/recorrido/pasos'

export interface RecorridoMapaProps {
  /**
   * Paso en el que está el candidato que se está mirando. Sin esto el mapa es
   * puramente explicativo: no marca nada como hecho ni como pendiente.
   */
  pasoActual?: PasoKey
  /** Rutas de los pasos que dependen del contexto (comparar, decidir). */
  hrefs?: Partial<Record<PasoKey, string>>
  className?: string
}

type Estado = 'hecho' | 'actual' | 'pendiente' | 'neutro'

function estadoDe(paso: PasoRecorrido, actual: PasoRecorrido | undefined): Estado {
  if (!actual) return 'neutro'
  if (paso.numero < actual.numero) return 'hecho'
  if (paso.numero === actual.numero) return 'actual'
  return 'pendiente'
}

const MARCA: Record<Estado, string> = {
  hecho: 'bg-primary/15 text-primary border-primary/30',
  actual: 'bg-primary text-white border-primary',
  pendiente: 'border-border bg-bg text-fg-subtle',
  neutro: 'border-border bg-bg text-fg-muted',
}

export function RecorridoMapa({ pasoActual, hrefs, className }: RecorridoMapaProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const actual = pasoActual ? PASOS_RECORRIDO.find((p) => p.key === pasoActual) : undefined

  return (
    <ol className={cn('space-y-0', className)}>
      {PASOS_RECORRIDO.map((paso, i) => {
        const estado = estadoDe(paso, actual)
        const declarado = hrefs?.[paso.key] ?? paso.href
        // Un "Ver →" que lleva a la pantalla en la que ya estás es ruido; se
        // oculta. Pero ese paso SÍ tiene pantalla —estás en ella—, así que no
        // debe caer en el "todavía sin pantalla" de abajo.
        const esLaPantallaActual = declarado != null && declarado === pathname
        // Un paso del inquilino no se enlaza NUNCA, ni con un `hrefs` a mano:
        // sus pantallas están cerradas con `allowedRoles={['tenant']}` y el
        // guard devuelve al agente al mismo lugar. Un link que parpadea y no
        // lleva a ningún lado es peor que ningún link.
        const href = esLaPantallaActual || paso.actor === 'inquilino' ? null : declarado
        const esUltimo = i === PASOS_RECORRIDO.length - 1
        // El corte: este paso abre el tramo de la inmobiliaria.
        const cambiaDeManos = i > 0 && PASOS_RECORRIDO[i - 1].actor !== paso.actor

        return (
          <li key={paso.key}>
            {cambiaDeManos && (
              <div className="flex items-center gap-3 py-4 pl-1">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {t('inmobiliaria.recorrido.cambioDeManos')}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            <div className="flex gap-4">
              {/* Riel: marca + línea de continuidad */}
              <div className="flex flex-col items-center">
                <span
                  data-paso={paso.numero}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                    'font-mono text-xs tabular-nums',
                    MARCA[estado],
                  )}
                >
                  {estado === 'hecho' ? (
                    <Check className="h-4 w-4" weight="bold" />
                  ) : (
                    paso.numero
                  )}
                </span>
                {!esUltimo && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
              </div>

              {/* Contenido */}
              <div className={cn('min-w-0 flex-1', esUltimo ? 'pb-0' : 'pb-6')}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      estado === 'pendiente' ? 'text-fg-muted' : 'text-fg',
                    )}
                  >
                    {t(paso.labelKey)}
                  </p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      paso.actor === 'inmobiliaria'
                        ? 'bg-primary-soft text-primary'
                        : 'bg-surface-muted text-fg-muted',
                    )}
                  >
                    {paso.actor === 'inmobiliaria'
                      ? t('inmobiliaria.recorrido.actorInmobiliaria')
                      : t('inmobiliaria.recorrido.actorInquilino')}
                  </span>
                </div>

                <p className="mt-1 text-sm text-fg-muted">{t(paso.descKey)}</p>

                {href ? (
                  <Link
                    href={href}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {t('inmobiliaria.recorrido.verPaso')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  paso.actor === 'inmobiliaria' &&
                  !esLaPantallaActual && (
                    // Honestidad: es un paso suyo y todavía no tiene pantalla propia.
                    <p className="mt-2 text-xs text-fg-subtle">
                      {t('inmobiliaria.recorrido.sinPantalla')}
                    </p>
                  )
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
