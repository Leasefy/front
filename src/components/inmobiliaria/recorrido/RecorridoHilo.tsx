'use client'

/**
 * RecorridoHilo — UNA LÍNEA arriba de una pantalla que ya existe, diciendo en
 * qué paso del recorrido está parada, de quién es la pelota y qué sigue. El
 * recorrido entero vive detrás de un botón.
 *
 * Lo que resuelve, en una línea: *de quién es la pelota*. Un «paso 4 de 11» sin
 * eso no le sirve a nadie — no distingue esperar de tener que actuar.
 *
 * ── Dos versiones, y lo que enseñó cada una ───────────────────────────────
 *
 * Nació como una TARJETA: borde, fondo propio, una barra decorativa de once
 * segmentos, el paso, una píldora con el actor y el siguiente paso. Resolvía lo
 * que tenía que resolver, y aun así estaba mal, por dos razones que conviene
 * dejar escritas para que el péndulo no vuelva:
 *
 *   · 🔴 ocupaba ~100 px con borde y fondo ARRIBA de lo que la persona vino a
 *     hacer — un formulario de contrato, una cola de estudios—, y en tres
 *     pantallas a la vez. Nico, 21-09-2026: «hay muchas pantallas que colocamos
 *     información ahí dispuesta y eso llena las pantallas de carga cognitiva
 *     innecesaria»;
 *   · la barra de once segmentos era decoración que repetía el texto que tenía
 *     al lado («Paso 8 de 11»). Dos veces el mismo dato, y el que se lee es el
 *     que está escrito.
 *
 * Ahora es una línea de texto sin caja, y el mapa de los once pasos se abre en
 * un modal con `ParaEntenderMas` — el mismo mapa que usa Postulaciones, así que
 * el recorrido se explica en UN solo lugar del producto.
 *
 * Lo que NO se movió detrás del botón, a propósito: el paso, el actor y el
 * siguiente. Eso no es explicación, es dónde estás parado; esconderlo sería
 * volver al problema que la tira vino a resolver.
 *
 * Ver `src/lib/recorrido/pasos.ts` para la definición de los 11 pasos.
 */

import Link from 'next/link'
import { ArrowRight, User, HandPointing } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { RecorridoMapa } from './RecorridoMapa'
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
  // Mismo criterio que `RecorridoMapa`: si el siguiente paso es del inquilino
  // se nombra pero no se enlaza — la agencia no entra a `/inquilino/*`.
  const hrefSiguiente =
    siguiente && siguiente.actor === 'inmobiliaria'
      ? hrefs?.[siguiente.key] ?? siguiente.href
      : null
  const meToca = actual.actor === 'inmobiliaria'

  return (
    <div
      className={cn(
        // Sin caja: es una línea de contexto, no un bloque de contenido. En
        // pantalla angosta envuelve en dos renglones en vez de estirar nada.
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-sm',
        className,
      )}
    >
      <span className="font-mono tabular-nums text-fg-muted">
        {t('inmobiliaria.recorrido.pasoDe', { n: actual.numero, total: TOTAL_PASOS })}
      </span>
      <span className="text-fg-subtle" aria-hidden="true">
        ·
      </span>
      <span className="font-medium text-fg">{t(actual.labelKey)}</span>
      <span className="text-fg-subtle" aria-hidden="true">
        ·
      </span>

      {/* Color + icono + texto: el estado nunca se comunica solo con color. */}
      <span
        className={cn(
          'inline-flex items-center gap-1',
          meToca ? 'font-medium text-primary' : 'text-fg-muted',
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

      {siguiente && (
        <>
          <span className="text-fg-subtle" aria-hidden="true">
            ·
          </span>
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
        </>
      )}

      {/* El recorrido entero, encima y sólo si lo piden. `ml-auto` lo manda al
          extremo cuando la línea cabe entera; cuando envuelve, cae solo. */}
      <ParaEntenderMas
        etiqueta={t('inmobiliaria.recorrido.verElRecorrido')}
        titulo={t('inmobiliaria.recorrido.titulo')}
        descripcion={t('inmobiliaria.recorrido.subtitulo')}
        ancho="ancho"
        className="ml-auto"
      >
        <RecorridoMapa pasoActual={paso} hrefs={hrefs} />
      </ParaEntenderMas>
    </div>
  )
}
