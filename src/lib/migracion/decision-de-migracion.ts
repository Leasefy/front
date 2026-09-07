/**
 * Lo que la inmobiliaria decidió sobre migrar sus datos al entrar por
 * primera vez al panel (Nico, 2026-09-07): antes del muro de migración se le
 * pregunta si quiere migrar ahora, en otro momento, o si no necesita migrar.
 *
 *  - `ahora`: ve la migración a pantalla completa, con los pasos.
 *  - `luego`: el muro se omite en el back (`POST /inmobiliaria/migracion/omitir`).
 *    También es lo que queda al cerrar la migración con su ✕ sin terminarla.
 *  - `nunca`: se omite en el back y el recordatorio del sidebar se apaga. Es
 *    lo que escribe la ✕ del propio recordatorio. Desde Configuración →
 *    Migración siempre se puede migrar igual y volver a prender el recordatorio.
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
 * El recordatorio del sidebar se apaga sólo con «no requiero migración» o con
 * su ✕ (las dos escriben `nunca`). Mientras tanto se muestra siempre que el
 * back diga que la migración está sin terminar — incluida la agencia que
 * eligió «ahora» y cerró a mitad de camino.
 */
export function recordatorioDeMigracionDescartado(agencyId: string | null | undefined): boolean {
  return leerDecisionDeMigracion(agencyId) === 'nunca'
}
