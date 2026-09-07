/**
 * Lo que la inmobiliaria decidió sobre migrar sus datos al entrar por
 * primera vez al panel (Nico, 2026-09-07): antes del muro de migración se le
 * pregunta si quiere migrar ahora, en otro momento, o si no necesita migrar.
 *
 *  - `ahora`: ve el muro con los pasos, como siempre.
 *  - `luego`: el muro se omite en el back (`POST /inmobiliaria/migracion/omitir`)
 *    y queda un recordatorio anclado en el sidebar hasta que migre o lo descarte.
 *  - `nunca`: se omite en el back y no hay recordatorio. Desde Configuración →
 *    Migración siempre se puede migrar igual, se haya descartado o no.
 *
 * La decisión vive en localStorage por agencia: el muro ya sabe si está
 * resuelta en el back; lo que el back no guarda es «quiero que me lo
 * recuerden», y eso es de este navegador. Se avisa con un evento para que el
 * sidebar reaccione sin recargar.
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

/** El recordatorio del sidebar se muestra sólo con «en otro momento». */
export function migracionPendienteDeRecordar(agencyId: string | null | undefined): boolean {
  return leerDecisionDeMigracion(agencyId) === 'luego'
}
