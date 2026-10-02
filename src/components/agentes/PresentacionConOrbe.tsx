'use client'

/**
 * PresentacionConOrbe — la tarjeta §Novedades de Cadence (`FeatureAnnouncement`)
 * con el ORBE GRANDE del agente en lugar de la aurora (Nico, 02-10-2026: «la
 * presentación de cada agente usa su orbe grande en vez de la aurora»).
 *
 * La usan la presentación de cada agente (`AgentIntroModal`) y la del Piloto
 * automático, que presenta a Ori (`PilotoNovedad`). Paleta, semilla y
 * variante salen del registro (`OrbeDeAgente` → `equipo.ts`), así que el orbe
 * es el MISMO de la lista «El equipo» y del chat.
 *
 * ── La composición ──────────────────────────────────────────────────────────
 * El héroe de la tarjeta mide 96 px y recorta (`overflow-hidden`): ahí un
 * orbe grande no cabe con su halo. `FeatureAnnouncement` no se toca; se le
 * pasa:
 *   · `heroGradient="transparent"`: sin aurora; el orbe queda sobre el fondo
 *     de la tarjeta (`bg-surface`), en claro y en oscuro.
 *   · `brand`: el escenario del orbe (`data-escenario-del-orbe`), centrado en
 *     lo que se ve del héroe (la hoja del cuerpo lo pisa 22 px).
 *   · `CLASE_DEL_HEROE`: el héroe que contiene el escenario (`:has()`, no
 *     «el primer hijo») crece a su alto y apaga el grano y el velo blanco de
 *     la aurora, que en oscuro dejaban una franja gris.
 *
 * ── El movimiento (Framer + tokens de Cadence) ──────────────────────────────
 *   1. El orbe ENTRA: fundido y escala desde `ESCALA_DE_ENTRADA`, en
 *      `motionDuration.reveal` con `motionEase.enter`.
 *   2. DESPIERTA: quieto → trabajando (late con su onda) → listo (se asienta).
 *      Los cambios de estado los funde el motor del orbe; acá sólo se dicen.
 *   3. Mientras tanto aparece el TEXTO: el título y todo lo que le sigue
 *      (descripción, pasos, botón) suben `motionDistance.sm` escalonados
 *      `motionStagger.step` (`useAnimate`, sobre el DOM de la tarjeta).
 *   Movimiento reducido: sin escala ni desplazamiento, sólo fundidos cortos
 *   (`enterTransition`), y el orbe queda `listo` de una, sin la secuencia.
 */

import { useEffect, useLayoutEffect, useState } from 'react'
import { motion, stagger, useAnimate } from 'framer-motion'
import {
  FeatureAnnouncement,
  enterTransition,
  motionDistance,
  motionDuration,
  motionEase,
  motionStagger,
  motionTransition,
  usePrefersReducedMotion,
  type FeatureAnnouncementProps,
} from '@leasefy/cadence'

import type { EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import type { AgenteDelEquipo, IdDeAgente } from '@/lib/agentes/equipo'
import { cn } from '@/lib/utils'

import { OrbeDeAgente } from './OrbeDeAgente'

/** Lado del orbe en la presentación (px). */
export const TAMANO_DEL_ORBE_EN_LA_PRESENTACION = 120

/** Alto del escenario: lo visible del héroe (H − 22 px de la hoja) le da aire al halo. */
const ALTO_DEL_ESCENARIO = 212
/** Lo que la hoja del cuerpo de la tarjeta pisa al héroe (`-mt-[22px]` en Cadence). */
const HOJA_SOBRE_EL_HEROE = 22
/** Aire de más arriba: el orbe baja un poco y queda a la misma distancia del borde y del título. */
const AIRE_ARRIBA = 12
/**
 * La cola del halo se funde en los últimos 34 px antes de la hoja: sin esto,
 * la hoja la cortaba en una raya recta (se veía en oscuro). El cuerpo del
 * orbe termina antes de que empiece el fundido.
 */
const FUNDIDO_DEL_HALO = `linear-gradient(to bottom, #000 calc(100% - ${HOJA_SOBRE_EL_HEROE + 34}px), transparent calc(100% - ${HOJA_SOBRE_EL_HEROE}px))`

/** De dónde crece el orbe al entrar (más que `motionScale.pop`: es el héroe). */
const ESCALA_DE_ENTRADA = 0.86

/**
 * La secuencia del despertar, en ms desde que abre. «trabajando» dura un
 * latido completo del motor (≈1,3 s) antes de asentarse.
 */
export const DESPERTAR: ReadonlyArray<{ estado: EstadoDelOrbe; enMs: number }> = [
  { estado: 'trabajando', enMs: 450 },
  { estado: 'listo', enMs: 1900 },
]

/** Cuándo empieza a subir el texto (s): con el orbe ya a medio entrar. */
const RETRASO_DEL_TEXTO = 0.12

/**
 * El héroe de `FeatureAnnouncement` que contiene el escenario: crece a su alto
 * (era `h-24`) y sin las dos capas de la aurora (grano y velo blanco).
 */
export const CLASE_DEL_HEROE =
  '[&>div:has([data-escenario-del-orbe])]:h-auto [&>div:has([data-escenario-del-orbe])>span]:hidden'

/**
 * Quieto → trabajando → listo; con movimiento reducido, listo de una. Arranca
 * siempre en `quieto` (el movimiento reducido no decide lo que se pinta
 * primero: ver `usePrefersReducedMotion`).
 */
function useDespertar(reducido: boolean): EstadoDelOrbe {
  const [estado, setEstado] = useState<EstadoDelOrbe>('quieto')
  useEffect(() => {
    if (reducido) {
      setEstado('listo')
      return
    }
    setEstado('quieto')
    const timers = DESPERTAR.map((p) => window.setTimeout(() => setEstado(p.estado), p.enMs))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [reducido])
  return estado
}

export interface PresentacionConOrbeProps
  extends Omit<FeatureAnnouncementProps, 'brand' | 'heroImage' | 'heroGradient' | 'appName' | 'appInitial'> {
  /** El agente que se presenta: su orbe reemplaza la aurora. */
  agente: IdDeAgente | AgenteDelEquipo
}

export function PresentacionConOrbe({ agente, className, ...tarjeta }: PresentacionConOrbeProps) {
  const reducido = usePrefersReducedMotion()
  const estado = useDespertar(reducido)
  const [scope, animate] = useAnimate<HTMLDivElement>()

  // El texto: el título y todo lo que le sigue en el cuerpo. Se deja en su
  // punto de partida ANTES de pintar (layout effect) para que no parpadee.
  useLayoutEffect(() => {
    const raiz = scope.current
    if (!raiz) return
    const piezas = Array.from(raiz.querySelectorAll<HTMLElement>('h3, h3 ~ *'))
    if (piezas.length === 0) return
    for (const el of piezas) {
      el.style.opacity = '0'
      if (!reducido) el.style.transform = `translateY(${motionDistance.sm}px)`
    }
    const controles = reducido
      ? animate(piezas, { opacity: [0, 1] }, { ...motionTransition.reduced, delay: stagger(motionStagger.step) })
      : animate(
          piezas,
          { opacity: [0, 1], y: [motionDistance.sm, 0] },
          {
            duration: motionDuration.slow,
            ease: motionEase.enter,
            delay: stagger(motionStagger.step, { startDelay: RETRASO_DEL_TEXTO }),
          },
        )
    return () => {
      controles.stop()
      for (const el of piezas) {
        el.style.opacity = ''
        el.style.transform = ''
      }
    }
    // Una vez por apertura: la tarjeta se monta al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={scope} className={cn('w-full', className)} data-testid="presentacion-con-orbe">
      <FeatureAnnouncement
        {...tarjeta}
        heroGradient="transparent"
        brand={
          <div
            data-escenario-del-orbe=""
            className="-mx-[18px] -my-4 flex items-center justify-center"
            style={{
              height: ALTO_DEL_ESCENARIO,
              paddingTop: AIRE_ARRIBA,
              paddingBottom: HOJA_SOBRE_EL_HEROE,
              maskImage: FUNDIDO_DEL_HALO,
              WebkitMaskImage: FUNDIDO_DEL_HALO,
            }}
          >
            {/* Con movimiento reducido la escala salta (duración 0) y sólo queda el fundido. */}
            <motion.div
              initial={{ opacity: 0, scale: ESCALA_DE_ENTRADA }}
              animate={{ opacity: 1, scale: 1 }}
              transition={enterTransition(reducido, { duration: 'reveal' })}
              className="flex"
            >
              <OrbeDeAgente agente={agente} tamano={TAMANO_DEL_ORBE_EN_LA_PRESENTACION} estado={estado} decorativo />
            </motion.div>
          </div>
        }
        className={cn('w-full', CLASE_DEL_HEROE)}
      />
    </div>
  )
}
