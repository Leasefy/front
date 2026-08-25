/**
 * aprobacion-from-prescoring — traduce el pre-scoring (Slice 2, back
 * principal) al modelo `Aprobacion` que ya consume todo el recorrido del
 * inquilino: `/inquilino/para-ti`, el home, el catálogo, la ficha de
 * propiedad.
 *
 * Vive en un archivo aparte para no crear una dependencia circular:
 * `aprobacion.service.ts` es el dueño del shape `Aprobacion` y
 * `prescoring.types.ts` es el dueño del shape del pre-scoring. Este
 * adaptador conoce a los dos; ninguno de los dos necesita conocer al otro.
 *
 * ⚠️ Regla dura de `scoring-domain`: nunca se inventa un número. Si ninguna
 * aseguradora manda un respaldo, `topeAprobadoCop` queda `null` — la UI dice
 * que falta, nunca rellena con un valor que nadie confirmó.
 *
 * El tope es el **máximo canon que respalda CUALQUIER aseguradora** — el mayor
 * de `carriers[].maxAsegurableCop` (Fianly + los proveedores futuros, mocks
 * hoy), no solo `fianly.maxEntrenchmentValue`. Así, si Fianly rechaza pero un
 * mock respalda hasta $X, la persona igual queda aprobada hasta $X. Se cae al
 * `maxEntrenchmentValue` de Fianly solo como fallback para un build viejo del
 * micro que aún no manda `max_asegurable_cop` por carrier.
 */

import { SIN_APROBACION, type Aprobacion, type AseguradoraVeredicto } from './aprobacion.service'
import { mapEstadoPreScoring, type PreScoringCarrier, type PreScoringCurrent } from './prescoring.types'

/**
 * El mayor respaldo entre todas las aseguradoras, con fallback al de Fianly.
 * `null` cuando nadie respalda nada (regla dura: no se inventa un número).
 */
function topeDesdeCarriers(
  carriers: PreScoringCarrier[],
  fianlyFallback: number | null,
): number | null {
  const max = carriers.reduce<number | null>((acc, c) => {
    const v = c.maxAsegurableCop
    // `== null` cubre null Y undefined (el campo es opcional en el type).
    if (v == null || v <= 0) return acc
    return acc === null ? v : Math.max(acc, v)
  }, null)
  return max ?? fianlyFallback ?? null
}

export function mapPreScoringToAprobacion(current: PreScoringCurrent): Aprobacion {
  const estado = mapEstadoPreScoring(current)
  const carriers = current.evaluation?.result?.carriers ?? []
  const aseguradoras: AseguradoraVeredicto[] = carriers.map((c) => ({
    nombre: c.name,
    aprobada: c.viable,
  }))

  if (estado === 'aprobado' || estado === 'rechazado') {
    return {
      estado,
      topeAprobadoCop:
        estado === 'aprobado'
          ? topeDesdeCarriers(
              carriers,
              current.evaluation?.result?.fianly.maxEntrenchmentValue ?? null,
            )
          : null,
      aseguradoras,
      vigenteHasta: null,
      resueltoEn: null,
      condicionada: false,
      canonConsultadoCop: null,
    }
  }

  if (estado === 'en_proceso') {
    return { ...SIN_APROBACION, estado: 'en_proceso' }
  }

  // sin_estudio | expirado | error: nada verificable que mostrar. Un estudio
  // vencido o fallido NO debe seguir filtrando el catálogo con un tope viejo.
  return SIN_APROBACION
}
