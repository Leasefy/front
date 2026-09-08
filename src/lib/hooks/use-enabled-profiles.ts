'use client'

/**
 * use-enabled-profiles.ts — reads which signup profiles an admin left enabled.
 *
 * FAIL-OPEN by design. Signup is the top of the funnel; hiding a profile is a
 * deliberate admin action, but a backend hiccup must never hide ALL of them.
 * So the hook:
 *   - starts with what the admin dijo la última vez (caché local) y, si nunca
 *     hubo respuesta, con every profile enabled,
 *   - narrows to the backend set only on a valid NON-EMPTY response, y guarda
 *     esa respuesta para la próxima carga,
 *   - on error keeps what it had (the cache, or all-enabled); on an empty
 *     response falls open to all.
 *
 * ── El parpadeo (Nico, 2026-09-07) ─────────────────────────────────────────
 * «Propietario» está apagado desde /admin/registration-profiles y aun así se
 * alcanzó a ver un instante en «Selecciona tu perfil». Era esto: el hook
 * arrancaba con TODOS los perfiles y la pantalla los pintaba mientras llegaba
 * la respuesta; al llegar, la tarjeta desaparecía. Dos arreglos que se
 * complementan: la caché de acá (la segunda visita ya arranca con el conjunto
 * real) y `esProvisional`, con el que la pantalla no pinta tarjetas mientras
 * no haya ni respuesta ni caché — con una espera acotada, para seguir
 * fallando abierto si la config no responde.
 *
 * Consumers use `isEnabled(key)` to filter their role cards.
 */

import { useEffect, useMemo, useState } from 'react'

import { fetchEnabledRegistrationProfiles } from '@/lib/api/registration-profiles.service'
import {
  REGISTRATION_PROFILE_KEYS,
  isRegistrationProfileKey,
  type RegistrationProfileKey,
} from '@/lib/constants/registration-profiles'

const ALL_ENABLED: readonly RegistrationProfileKey[] = REGISTRATION_PROFILE_KEYS

/** Lo último que respondió el back, para arrancar con eso y no con «todos». */
export const CLAVE_DE_CACHE_DE_PERFILES = 'leasefy-perfiles-de-registro'

function leerCache(): readonly RegistrationProfileKey[] | null {
  if (typeof window === 'undefined') return null
  try {
    const crudo = window.localStorage.getItem(CLAVE_DE_CACHE_DE_PERFILES)
    if (!crudo) return null
    const valor: unknown = JSON.parse(crudo)
    if (!Array.isArray(valor)) return null
    const claves = valor.filter(isRegistrationProfileKey)
    return claves.length > 0 ? claves : null
  } catch {
    return null
  }
}

function guardarCache(claves: readonly RegistrationProfileKey[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLAVE_DE_CACHE_DE_PERFILES, JSON.stringify(claves))
  } catch {
    // Sin almacenamiento (modo privado, cuota): la próxima carga vuelve a fallar abierto.
  }
}

export interface UseEnabledProfilesResult {
  /** The enabled keys as a set. Defaults to the cache, then to all. */
  enabled: Set<RegistrationProfileKey>
  isEnabled: (key: RegistrationProfileKey) => boolean
  isLoading: boolean
  /**
   * `true` mientras el conjunto es el optimista («todos») porque todavía no
   * hay respuesta del back ni caché de una visita anterior. Es el momento en
   * que una pantalla NO debería pintar tarjetas: la que el admin apagó
   * aparecería y se iría al llegar la respuesta.
   */
  esProvisional: boolean
}

export function useEnabledProfiles(): UseEnabledProfilesResult {
  // `undefined` = todavía no se miró la caché. Se lee al montar y NO en el
  // estado inicial: en el servidor no hay localStorage, y un estado inicial
  // distinto entre servidor y navegador rompe la hidratación (el HTML traía
  // el esqueleto y el cliente pintaba tarjetas; React lo reportaba como error
  // en «Selecciona tu perfil», 2026-09-07).
  const [cacheInicial, setCacheInicial] = useState<
    readonly RegistrationProfileKey[] | null | undefined
  >(undefined)
  const [keys, setKeys] = useState<readonly RegistrationProfileKey[]>(ALL_ENABLED)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const cache = leerCache()
    setCacheInicial(cache)
    if (cache) setKeys(cache)

    fetchEnabledRegistrationProfiles()
      .then((enabledKeys) => {
        if (cancelled) return
        if (enabledKeys.length > 0) {
          setKeys(enabledKeys)
          guardarCache(enabledKeys)
        } else {
          // Empty set → treat as misconfiguration and fail open, never a dead signup.
          setKeys(ALL_ENABLED)
        }
      })
      .catch(() => {
        // Sin respuesta se queda con lo que tenía: la caché si la hay, o todos.
        if (cancelled) return
        setKeys((actuales) => (actuales.length > 0 ? actuales : ALL_ENABLED))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const enabled = useMemo(() => new Set(keys), [keys])

  return {
    enabled,
    isEnabled: (key) => enabled.has(key),
    isLoading,
    esProvisional: isLoading && !cacheInicial,
  }
}
