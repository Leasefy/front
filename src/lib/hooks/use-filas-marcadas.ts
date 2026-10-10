'use client'

/**
 * Las filas marcadas de una tabla con acciones masivas (Nico, 10-10-2026).
 *
 * Marcar sobrevive al cambio de página (se puede juntar de varias), pero se
 * borra cuando cambia `llave` —los filtros o la búsqueda—: lo marcado que ya
 * no se ve no se toca sin verlo.
 */

import { useCallback, useEffect, useState } from 'react'

export function useFilasMarcadas(llave?: string) {
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set())

  const marcar = useCallback((ids: readonly string[], si: boolean) => {
    setMarcadas((antes) => {
      const s = new Set(antes)
      for (const id of ids) {
        if (si) s.add(id)
        else s.delete(id)
      }
      return s
    })
  }, [])

  const quitar = useCallback(() => setMarcadas(new Set()), [])

  useEffect(() => {
    setMarcadas(new Set())
  }, [llave])

  return { marcadas, marcar, quitar }
}

/** La casilla de arriba: todas, ninguna o algunas de las que se ven. */
export function casillaDeLaPagina(
  idsDeLaPagina: readonly string[],
  marcadas: ReadonlySet<string>,
): boolean | 'indeterminate' {
  const cuantas = idsDeLaPagina.filter((id) => marcadas.has(id)).length
  if (cuantas === 0) return false
  return cuantas === idsDeLaPagina.length ? true : 'indeterminate'
}
