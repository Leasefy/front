'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Cambio = Record<string, string | number | undefined | null>

/**
 * Dónde guarda una tabla del admin su búsqueda, pestaña, orden y página
 * (20-10-2026). En la pantalla, en la URL —una tabla filtrada se comparte con
 * el enlace, como dice `useUrlFilters`—. Fuera del enrutador de Next (una
 * prueba que monta la tabla sola) no hay URL: se guarda en el estado del
 * componente y la tabla funciona igual.
 */
export function useEstadoDeLaTabla() {
  let router: ReturnType<typeof useRouter> | null = null
  try {
    // Sin el enrutador montado, `useRouter` lanza («expected app router to be mounted»).
    router = useRouter()
  } catch {
    router = null
  }
  const sp = useSearchParams()
  const pathname = usePathname()
  const [local, setLocal] = useState<Record<string, string>>({})
  const conUrl = Boolean(router && sp && pathname)

  const get = useCallback((k: string) => (conUrl ? (sp?.get(k) ?? '') : (local[k] ?? '')), [conUrl, sp, local])

  const setFilters = useCallback(
    (cambio: Cambio) => {
      if (conUrl && router && sp) {
        const next = new URLSearchParams(sp.toString())
        for (const [k, v] of Object.entries(cambio)) {
          if (v === undefined || v === null || v === '') next.delete(k)
          else next.set(k, String(v))
        }
        const qs = next.toString()
        router.replace(qs ? `${pathname}?${qs}` : (pathname ?? ''))
        return
      }
      setLocal((antes) => {
        const nuevo = { ...antes }
        for (const [k, v] of Object.entries(cambio)) {
          if (v === undefined || v === null || v === '') delete nuevo[k]
          else nuevo[k] = String(v)
        }
        return nuevo
      })
    },
    [conUrl, router, sp, pathname],
  )

  return { get, setFilters }
}
