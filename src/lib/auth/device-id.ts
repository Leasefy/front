/**
 * El id de ESTE navegador para la sesión única.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * El cartel «cerramos tu sesión en otro dispositivo» salía en cada login.
 * El back sólo sabía el id de la sesión anterior, y cerrar sesión no lo
 * borra, así que la sesión anterior de ESTE MISMO navegador —cerrada o
 * vencida— contaba como otro dispositivo. Con un id por navegador, el back
 * puede decir «otro dispositivo» sólo cuando de verdad lo es.
 *
 * ── Qué es ───────────────────────────────────────────────────────────────
 * Un UUID que se genera una vez y se guarda en localStorage bajo la clave
 * `leasefy:device-id`. No identifica a la persona ni a la cuenta: dos cuentas
 * en el mismo navegador comparten el id, y la misma cuenta en dos navegadores
 * tiene dos. Sobrevive al cierre de sesión a propósito —`purgarSesionLocal`
 * sólo borra las claves de Supabase— porque justamente es lo que tiene que
 * seguir igual entre un login y el siguiente.
 *
 * Sin localStorage (modo privado estricto, cuota llena) devuelve `undefined`
 * y el back cae a su regla anterior; nunca inventa uno por petición, porque
 * un id nuevo en cada login sería exactamente el defecto que se arregla.
 */

const STORAGE_KEY = 'leasefy:device-id'
const FORMA_VALIDA = /^[A-Za-z0-9_-]{8,64}$/

function generar(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Navegadores viejos sin randomUUID: suficiente para distinguir navegadores,
  // que es lo único que este id tiene que hacer.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function getDeviceId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY)
    if (guardado && FORMA_VALIDA.test(guardado)) return guardado
    const nuevo = generar()
    window.localStorage.setItem(STORAGE_KEY, nuevo)
    return nuevo
  } catch {
    return undefined
  }
}
