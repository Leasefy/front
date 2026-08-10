'use client'

/**
 * agentFetch — `fetch` contra el microservicio del agente que sobrevive a que
 * el token venza.
 *
 * El problema que resuelve: `agentAuthHeaders()` lee un access token guardado
 * en memoria que sólo se reescribe cuando Supabase emite `TOKEN_REFRESHED`. Si
 * el token vence mientras la pestaña está en segundo plano (o el refresh
 * automático no llegó a correr), TODA llamada al agente sale con el token viejo
 * y responde 401. Las pantallas que hacen polling quedan clavadas en "Error
 * cargando datos: 401" hasta que el usuario recarga a mano — que es justo lo
 * que una pantalla auto-actualizable no debería pedir.
 *
 * Acá el 401 se trata como lo que casi siempre es —un token vencido, no una
 * falta de permisos— y se reintenta UNA vez con sesión fresca. Si el segundo
 * intento también da 401, ahí sí es un problema real de acceso y se devuelve
 * tal cual para que la UI lo muestre.
 */

import { getSupabase } from '@/lib/supabase/client'
import { getAccessToken, setAccessToken } from './client'
import { agentAuthHeaders } from './agent-auth'

/**
 * Refresco en vuelo compartido. Varias pantallas pueden hacer polling a la vez
 * y chocar contra el mismo 401; sin esto dispararían N refreshes simultáneos
 * contra Supabase por la misma sesión vencida.
 */
let inFlightRefresh: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh

  inFlightRefresh = (async () => {
    const supabase = getSupabase()
    if (!supabase) return null
    try {
      // getSession() ya renueva sola si el token venció; refreshSession() queda
      // como segundo intento cuando la sesión cacheada también está vieja.
      const { data } = await supabase.auth.getSession()
      let token = data.session?.access_token ?? null

      if (!token || token === getAccessToken()) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        token = refreshed.session?.access_token ?? token
      }

      if (token) setAccessToken(token)
      return token
    } catch {
      // Sin sesión recuperable: que el 401 original llegue a la UI.
      return null
    } finally {
      inFlightRefresh = null
    }
  })()

  return inFlightRefresh
}

/**
 * `fetch` con Authorization del agente y un reintento ante 401.
 *
 * Misma firma que `fetch`: los headers extra que pases se conservan, sólo se
 * agrega/reescribe el `Authorization`.
 */
export async function agentFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await globalThis.fetch(input, {
    ...init,
    headers: agentAuthHeaders(init?.headers),
  })

  if (res.status !== 401) return res

  const tokenBefore = getAccessToken()
  const token = await refreshAccessToken()
  // Si no hay token nuevo, reintentar sería mandar exactamente lo mismo.
  if (!token || token === tokenBefore) return res

  return globalThis.fetch(input, {
    ...init,
    headers: agentAuthHeaders(init?.headers),
  })
}
