'use client'

/**
 * ¿Hay un extracto bancario cargado? Lo sabe el BACK, no el agente.
 *
 * ── Por qué existe este hook ───────────────────────────────────────────────
 *
 * En Conciliación conviven dos servidores: el AGENTE (`/conciliacion/*`), que
 * cruza su propia copia de los movimientos, y el BACK
 * (`/inmobiliaria/conciliacion-bancaria`), que es quien RECIBE el extracto.
 * Preguntarle al agente si hay extracto da «no» aunque el banco haya mandado
 * tres movimientos ayer — y esa confusión ya produjo dos veces la misma frase
 * falsa en dos pantallas distintas:
 *
 *   · 20-09, Resumen: «no has cargado ningún extracto» con un extracto del 2
 *     de septiembre y 3 movimientos esperando al lado;
 *   · 21-09, Por revisar: «Nada por revisar. Sube un extracto del banco…» con
 *     ese mismo extracto ya cargado.
 *
 * Un defecto en dos pantallas no es de las pantallas: es del primitivo. Acá
 * está el primitivo.
 *
 * 🔴 `sinExtracto` sólo es `true` cuando el back CONTESTÓ que no hay ninguno.
 * Mientras no se sepa —o si la llamada falla— queda en `false` y `leyendo` en
 * `true`: «no sé» no es «no hay», y afirmar lo segundo es cómo se le dice a
 * alguien que suba lo que ya subió.
 */

import { useEffect, useState } from 'react'

import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service'
import type { ResumenDeConciliacion } from '@/lib/api/conciliacion-bancaria.types'

export interface ExtractoDelBack {
  /** Lo que contestó el back. `null` = no contestó o falló. */
  delBack: ResumenDeConciliacion | null
  /** Todavía se está preguntando. */
  leyendo: boolean
  /** El back dijo que NUNCA se cargó un extracto. */
  sinExtracto: boolean
  /** El back dijo que hay extracto. Es lo que apaga un «sube un extracto». */
  hayExtracto: boolean
}

export function useExtractoDelBack(): ExtractoDelBack {
  const [delBack, setDelBack] = useState<ResumenDeConciliacion | null>(null)
  const [leyendo, setLeyendo] = useState(true)

  useEffect(() => {
    let vivo = true
    conciliacionBancariaApi
      .resumen()
      .then((r) => {
        if (vivo) setDelBack(r)
      })
      .catch(() => {
        // Que falle no puede volver a afirmar que no hay nada.
        if (vivo) setDelBack(null)
      })
      .finally(() => {
        if (vivo) setLeyendo(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  return {
    delBack,
    leyendo,
    sinExtracto: delBack !== null && delBack.ultimoExtracto === null,
    hayExtracto: delBack !== null && delBack.ultimoExtracto !== null,
  }
}
