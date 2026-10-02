/**
 * ¿Ya se sabe, en este navegador, que el muro de migración NO va para esta
 * inmobiliaria? (Nico, 01-10-2026: «hay un momento que pueden ver todo el
 * panel y luego sale el modal de migración»).
 *
 * El muro sólo sabe si tapa cuando vuelve `GET /inmobiliaria/migracion/estado`.
 * Mientras tanto el panel va difuminado (`MuroDeMigracion`): nunca nítido antes
 * de que la persona decida. Pero a quien el muro ya no le aplica —terminó,
 * omitió, decidió «en otro momento» o «no requiero»— ese difuminado de cada
 * carga sería un parpadeo. Esta marca es la que lo evita: la deja la última
 * respuesta VÁLIDA con `bloquea: false`, y la borra una que diga `bloquea: true`.
 *
 * No es una caché del estado ni decide nada: si la marca miente (otro equipo
 * reabrió la migración), la consulta igual corre y el muro sale encima, que es
 * como funcionaba antes de esto. Sin almacenamiento (modo privado), no hay
 * marca y se difumina hasta saber: el lado seguro.
 */

const PREFIJO = 'leasefy:migracion:muro-abajo:'

function clave(agencyId: string | null | undefined): string {
  return `${PREFIJO}${agencyId ?? 'agencia'}`
}

export function muroAbajoRecordado(agencyId: string | null | undefined): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(clave(agencyId)) === '1'
  } catch {
    return false
  }
}

export function recordarMuroAbajo(agencyId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(clave(agencyId), '1')
  } catch {
    // Sin almacenamiento: la próxima carga se difumina hasta saber.
  }
}

export function olvidarMuroAbajo(agencyId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(clave(agencyId))
  } catch {
    // Nada que borrar.
  }
}
