'use client'

/**
 * LineaDeMadurez — una métrica que Naira todavía no evalúa (warm-up), con la fecha en que tendrá historia o con el
 * remedio que dice el servidor (Fase 13, plan 13-03; NOT-05, UI-SPEC §7.1).
 *
 * La frase de NOT-05 (la infalsificable: la que dice que Naira sigue en proceso sin decir hasta cuándo ni por qué) está
 * prohibida: una línea de madurez dice CUÁNDO o QUÉ falta, nunca una promesa sin fecha. El remedio del servidor se
 * pinta tal cual; la métrica, por su id (el front no tiene el mapa de nombres, E13-13).
 *
 * Es parte del espejo de E13-5: se ve cuando la ruta traiga las líneas de madurez.
 */

import type { JSX } from 'react'

import { useI18n } from '@/lib/i18n'
import { formatearDia, type LineaDeMadurezVisible } from '@/lib/naira/briefing-y-senal'

export interface LineaDeMadurezProps {
  readonly linea: LineaDeMadurezVisible
}

export function LineaDeMadurez({ linea }: LineaDeMadurezProps): JSX.Element {
  const { t } = useI18n()

  function texto(): string {
    switch (linea.madurez.kind) {
      case 'fecha_estimada':
        return t('inmobiliaria.ai.naira.madurez.fechaEstimada', {
          metrica: linea.metricId,
          fecha: formatearDia(linea.madurez.dia),
        })
      case 'sin_fecha':
        return t('inmobiliaria.ai.naira.madurez.sinFecha', { metrica: linea.metricId, remedio: linea.madurez.remedio })
      default: {
        const _exhaustivo: never = linea.madurez
        return _exhaustivo
      }
    }
  }

  return (
    <p data-naira-madurez={linea.madurez.kind} className="text-sm text-fg">
      {texto()}
    </p>
  )
}
