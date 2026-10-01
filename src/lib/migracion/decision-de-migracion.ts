/**
 * Lo que la inmobiliaria decidió sobre migrar sus datos al entrar por
 * primera vez al panel (Nico, 2026-09-07): antes del muro de migración se le
 * pregunta si quiere migrar ahora, en otro momento, o si no necesita migrar.
 *
 *  - `ahora`: ve la migración a pantalla completa, con los pasos.
 *  - `luego`: el muro se omite en el back (`POST /inmobiliaria/migracion/omitir`).
 *    También es lo que queda al cerrar la migración con su ✕ sin terminarla.
 *  - `nunca`: se omite en el back. Desde Configuración → Migración siempre
 *    se puede migrar igual.
 *
 * La tarjeta del menú NO lee la decisión: lee `eligioMigrar` (abajo), porque
 * la decisión se pisa al cerrar el muro a mitad de camino.
 *
 * 🔴 Lo que el recordatorio MUESTRA —cuántos pasos van, cuál sigue— no vive
 * acá: sale del estado que contesta el back (`GET /inmobiliaria/migracion/estado`),
 * que es por cuenta y no por navegador. Acá sólo vive «no me lo recuerdes»,
 * que el back no guarda; por eso es de este navegador. Se avisa con un evento
 * para que el sidebar reaccione sin recargar.
 */

export type DecisionDeMigracion = 'ahora' | 'luego' | 'nunca'

export const EVENTO_DECISION_DE_MIGRACION = 'leasefy:migracion:decision'

const PREFIJO = 'leasefy:migracion:decision:'

function clave(agencyId: string | null | undefined): string {
  return `${PREFIJO}${agencyId ?? 'agencia'}`
}

export function esDecisionDeMigracion(valor: unknown): valor is DecisionDeMigracion {
  return valor === 'ahora' || valor === 'luego' || valor === 'nunca'
}

export function leerDecisionDeMigracion(agencyId: string | null | undefined): DecisionDeMigracion | null {
  if (typeof window === 'undefined') return null
  try {
    const valor = window.localStorage.getItem(clave(agencyId))
    return esDecisionDeMigracion(valor) ? valor : null
  } catch {
    return null
  }
}

export function guardarDecisionDeMigracion(
  agencyId: string | null | undefined,
  decision: DecisionDeMigracion,
): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(clave(agencyId), decision)
  } catch {
    // Sin almacenamiento (modo privado, cuota): el recordatorio no sobrevive a la recarga.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_DECISION_DE_MIGRACION, { detail: { agencyId, decision } }))
}

/**
 * 🔴 ¿Le dio «Migrar» alguna vez? (Nico, 01-10: «pon estático ese modal de
 * migración mientras esté la migración en proceso, cuando ya se complete se
 * quita, y si no le da migrar pues no aparece»).
 *
 * Una marca APARTE de la decisión, porque la decisión se pisa: la ✕ del muro
 * escribe `luego` también a quien eligió «ahora» y cerró a mitad de camino, y
 * ésa persona SÍ está migrando. Se marca al elegir «Migrar ahora» y cada vez
 * que se abre la migración (desde Configuración o desde la tarjeta). No se
 * desmarca: cuando la migración termina, la tarjeta se va sola.
 */
const PREFIJO_ELIGIO = 'leasefy:migracion:eligio-migrar:'

export function marcarQueEligioMigrar(agencyId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(`${PREFIJO_ELIGIO}${agencyId ?? 'agencia'}`) === '1') return
    window.localStorage.setItem(`${PREFIJO_ELIGIO}${agencyId ?? 'agencia'}`, '1')
  } catch {
    // Sin almacenamiento: la tarjeta igual sale en cuanto haya un paso listo.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_DECISION_DE_MIGRACION, { detail: { agencyId } }))
}

export function eligioMigrar(agencyId: string | null | undefined): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(`${PREFIJO_ELIGIO}${agencyId ?? 'agencia'}`) === '1'
  } catch {
    return false
  }
}
